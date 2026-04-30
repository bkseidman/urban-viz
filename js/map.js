const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

let selectedStreet = null;
let activeMapMode = "none";
let activeFrequencyGroup = null;
let activeHeatmapCells = new Set();

function getStreetName(d) {
  if (d.properties.schedule_details && d.properties.schedule_details.corridor) {
    return d.properties.schedule_details.corridor;
  }

  return (
    d.properties.street ||
    d.properties.street_name ||
    d.properties.STREET ||
    d.properties.STREETNAME ||
    d.properties.fullname ||
    d.properties.name ||
    "Street segment"
  );
}

function yesNo(value) {
  return value === "1" ? "Yes" : "No";
}

function valueOrUnknown(value) {
  if (value === undefined || value === null || value === "") {
    return "Unknown";
  }

  return value;
}

function getStreetCells(d) {
  const details = d.properties.schedule_details;

  if (!details || !details.heatmap_cells) {
    return [];
  }

  return details.heatmap_cells
    .split(",")
    .map(cell => cell.trim())
    .filter(cell => cell !== "" && !cell.includes("Other"));
}

function streetMatchesActiveHeatmap(d) {
  const cells = getStreetCells(d);
  return cells.some(cell => activeHeatmapCells.has(cell));
}

function updateLinkedViews(d) {
  const details = d.properties.schedule_details;

  if (!details) {
    return;
  }

  if (window.highlightFrequencyGroup) {
    window.highlightFrequencyGroup(details.frequency_group);
  }

  if (window.highlightHeatmapCells) {
    window.highlightHeatmapCells(details.heatmap_cells);
  }
}

function updateDetailPanel(d) {
  const props = d.properties;
  const details = props.schedule_details;

  if (!details) {
    d3.select("#detail-panel").html(`
      <h2>Selected Street</h2>
      <p><strong>Street:</strong> ${getStreetName(d)}</p>
      <p><strong>CNN:</strong> ${valueOrUnknown(props.cnn)}</p>
      <p><strong>Frequency group:</strong> ${valueOrUnknown(props.frequency_group)}</p>
      <p class="hint">No detailed schedule information was found for this street segment.</p>
    `);

    return;
  }

  d3.select("#detail-panel").html(`
    <h2>Selected Street</h2>

    <p><strong>Street:</strong> ${valueOrUnknown(details.corridor)}</p>
    <p><strong>Limits:</strong> ${valueOrUnknown(details.limits)}</p>
    <p><strong>CNN:</strong> ${valueOrUnknown(details.cnn)}</p>

    <hr>

    <p><strong>Monthly frequency:</strong> ${valueOrUnknown(details.monthly_frequency)}</p>
    <p><strong>Frequency group:</strong> ${valueOrUnknown(details.frequency_group)}</p>
    <p><strong>Days cleaned:</strong> ${valueOrUnknown(details.days_cleaned)}</p>
    <p><strong>Time ranges:</strong> ${valueOrUnknown(details.time_ranges)}</p>

    <hr>

    <p><strong>Schedule:</strong><br>${valueOrUnknown(details.schedule_summary)}</p>
    <p><strong>Block side:</strong> ${valueOrUnknown(details.block_sides)}</p>
    <p><strong>Side swept:</strong> ${valueOrUnknown(details.street_sides)}</p>
    <p><strong>Swept on holidays:</strong> ${yesNo(details.holidays)}</p>

    <p class="hint">
      The frequency chart and heatmap are highlighting this street's matching patterns.
    </p>
  `);
}

Promise.all([
  d3.json("data/raw/active_streets.geojson"),
  d3.csv("data/processed/cnn_totals.csv"),
  d3.csv("data/processed/cnn_schedule_details.csv")
]).then(([geoData, freqData, scheduleDetails]) => {

  const freqMap = new Map();
  const detailsMap = new Map();

  freqData.forEach(d => {
    freqMap.set(String(d.cnn), {
      frequency_group: d.frequency_group
    });
  });

  scheduleDetails.forEach(d => {
    detailsMap.set(String(d.cnn), d);
  });

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const freqMatch = freqMap.get(cnn);
    const detailMatch = detailsMap.get(cnn);

    if (freqMatch) {
      feature.properties.frequency_group = freqMatch.frequency_group;
    } else {
      feature.properties.frequency_group = "No data";
    }

    if (detailMatch) {
      feature.properties.schedule_details = detailMatch;
    }
  });

  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  const order = [
    "1-10", "11-20", "21-30", "31-40", "41-50",
    "51-60", "61-70", "71-80", "81-90", "91-100", "101+"
  ];

  const color = d3.scaleOrdinal()
    .domain(order)
    .range([
      "#e3f2fd",
      "#cfe8f7",
      "#b6dbef",
      "#9ccdea",
      "#7fbbe2",
      "#64a7d7",
      "#4a91cb",
      "#327abf",
      "#1f66b2",
      "#0f4f9e",
      "#08306b"
    ]);

  const tooltip = d3.select("#map-tooltip");

  const mapGroup = svg.append("g")
    .attr("class", "map-group");

  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .translateExtent([
      [-width, -height],
      [width * 2, height * 2]
    ])
    .on("zoom", function(event) {
      mapGroup.attr("transform", event.transform);
    });

  svg.call(zoom);
  svg.on("dblclick.zoom", null);

  mapGroup.selectAll(".base")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("class", "base")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0.7);

  const streets = mapGroup.selectAll(".overlay")
    .data(geoData.features.filter(d => d.properties.frequency_group !== "No data"))
    .enter()
    .append("path")
    .attr("class", "overlay")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => color(d.properties.frequency_group))
    .attr("stroke-width", 1.8)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.95)

    .on("mouseover", function(event, d) {
      d3.select(this)
        .raise()
        .attr("stroke", "#000")
        .attr("stroke-width", 4)
        .attr("opacity", 1);

      const details = d.properties.schedule_details;

      tooltip
        .style("display", "block")
        .html(`
          <strong>${getStreetName(d)}</strong><br>
          ${details && details.limits ? `${details.limits}<br>` : ""}
          Frequency: ${details ? details.monthly_frequency : d.properties.frequency_group}<br>
          Days: ${details ? details.days_cleaned : "Unknown"}<br>
          Time: ${details ? details.time_ranges : "Unknown"}
        `);
    })

    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })

    .on("mouseout", function() {
      applyMapStyles();
      tooltip.style("display", "none");
    })

    .on("click", function(event, d) {
      selectedStreet = d;
      activeMapMode = "street";
      activeFrequencyGroup = null;
      activeHeatmapCells = new Set();

      applyMapStyles();

      d3.select(this).raise();

      updateDetailPanel(d);
      updateLinkedViews(d);
    });

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)");

  legend.selectAll("rect")
    .data(order)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(order)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 11)
    .text(d => d)
    .style("font-size", "12px");

  function applyMapStyles() {
    streets
      .classed("selected", d => activeMapMode === "street" && selectedStreet === d)
      .attr("stroke", d => {
        if (activeMapMode === "street" && selectedStreet === d) {
          return "#000";
        }

        if (activeMapMode === "frequency" && d.properties.frequency_group === activeFrequencyGroup) {
          return "#000";
        }

        if (activeMapMode === "heatmap" && streetMatchesActiveHeatmap(d)) {
          return "#000";
        }

        return color(d.properties.frequency_group);
      })
      .attr("stroke-width", d => {
        if (activeMapMode === "street" && selectedStreet === d) {
          return 4;
        }

        if (activeMapMode === "frequency" && d.properties.frequency_group === activeFrequencyGroup) {
          return 3.5;
        }

        if (activeMapMode === "heatmap" && streetMatchesActiveHeatmap(d)) {
          return 3.5;
        }

        if (activeMapMode === "none") {
          return 1.8;
        }

        return 1.2;
      })
      .attr("opacity", d => {
        if (activeMapMode === "none") {
          return 0.95;
        }

        if (activeMapMode === "street") {
          return selectedStreet === d ? 1 : 0.25;
        }

        if (activeMapMode === "frequency") {
          return d.properties.frequency_group === activeFrequencyGroup ? 1 : 0.12;
        }

        if (activeMapMode === "heatmap") {
          return streetMatchesActiveHeatmap(d) ? 1 : 0.12;
        }

        return 0.95;
      });
  }

  function updatePatternPanel(title, value, count) {
    d3.select("#detail-panel").html(`
      <h2>${title}</h2>
      <p><strong>Selected pattern:</strong> ${value}</p>
      <p><strong>Matching street segments:</strong> ${count}</p>
      <p class="hint">
        Streets matching this chart selection are highlighted on the map.
        Click an individual street to return to street-level details.
      </p>
    `);
  }

  window.highlightMapByFrequencyGroup = function(frequencyGroup) {
    selectedStreet = null;
    activeMapMode = "frequency";
    activeFrequencyGroup = frequencyGroup;
    activeHeatmapCells = new Set();

    const matchCount = streets
      .data()
      .filter(d => d.properties.frequency_group === frequencyGroup)
      .length;

    applyMapStyles();

    updatePatternPanel(
      "Frequency Group",
      frequencyGroup,
      matchCount
    );
  };

  window.highlightMapByHeatmapCells = function(heatmapCells) {
    selectedStreet = null;
    activeMapMode = "heatmap";
    activeFrequencyGroup = null;

    activeHeatmapCells = new Set(
      heatmapCells
        .split(",")
        .map(d => d.trim())
        .filter(d => d !== "" && !d.includes("Other"))
    );

    const matchCount = streets
      .data()
      .filter(d => streetMatchesActiveHeatmap(d))
      .length;

    applyMapStyles();

    updatePatternPanel(
      "Weekday / Time Selection",
      heatmapCells,
      matchCount
    );
  };

  window.resetDashboardSelection = function() {
    selectedStreet = null;
    activeMapMode = "none";
    activeFrequencyGroup = null;
    activeHeatmapCells = new Set();

    applyMapStyles();

    d3.select("#detail-panel").html(`
      <h2>Selected Street</h2>
      <p class="hint">Click a colored street segment to view its sweeping schedule.</p>
    `);

    if (window.resetFrequencyHighlight) {
      window.resetFrequencyHighlight();
    }

    if (window.resetHeatmapHighlight) {
      window.resetHeatmapHighlight();
    }
  };

  d3.select("#reset-selection").on("click", function() {
    window.resetDashboardSelection();
  });

}).catch(error => {
  console.error("Error loading map data:", error);
});
