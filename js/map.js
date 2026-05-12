const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

let selectedStreet = null;
let activeMapMode = "none";
let activeFrequencyGroup = null;
let activeHeatmapCells = new Set();
let activeHeatmapValue = 0;
let activeCorridor = null;

const MAP_HIGHLIGHT_COLOR = "#8d5aa7";

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

function escapeHTML(value) {
  return String(valueOrUnknown(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  if (activeHeatmapCells.size === 0) {
    return true;
  }

  const cells = getStreetCells(d);
  return cells.some(cell => activeHeatmapCells.has(cell));
}

function streetMatchesActiveFrequency(d) {
  if (!activeFrequencyGroup) {
    return true;
  }

  return d.properties.frequency_group === activeFrequencyGroup;
}

function streetMatchesActiveCorridor(d) {
  const details = d.properties.schedule_details;

  if (!details || !details.corridor) {
    return false;
  }

  return details.corridor === activeCorridor;
}

function streetMatchesActiveFilters(d) {
  return streetMatchesActiveFrequency(d) && streetMatchesActiveHeatmap(d);
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

  if (window.highlightTopStreetBar) {
    window.highlightTopStreetBar(details.corridor);
  }
}

/* =========================================================
   DETAIL PANEL HELPERS
========================================================= */

function normalizeDay(day) {
  const cleaned = String(day).trim().toLowerCase();

  const dayMap = {
    mon: "Mon",
    monday: "Mon",
    tue: "Tue",
    tues: "Tue",
    tuesday: "Tue",
    wed: "Wed",
    weds: "Wed",
    wednesday: "Wed",
    thu: "Thu",
    thur: "Thu",
    thurs: "Thu",
    thursday: "Thu",
    fri: "Fri",
    friday: "Fri",
    sat: "Sat",
    saturday: "Sat",
    sun: "Sun",
    sunday: "Sun"
  };

  return dayMap[cleaned] || day;
}

function parseDaysCleaned(daysCleaned) {
  if (!daysCleaned || daysCleaned === "Unknown") {
    return [];
  }

  return String(daysCleaned)
    .split(",")
    .map(day => normalizeDay(day))
    .filter(day => day !== "");
}

function renderWeekdayChips(daysCleaned) {
  const activeDays = new Set(parseDaysCleaned(daysCleaned));
  const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return `
    <div class="weekday-row">
      ${weekdayOrder.map(day => `
        <span class="weekday-chip ${activeDays.has(day) ? "active" : ""}">
          ${day}
        </span>
      `).join("")}
    </div>
  `;
}

function splitList(value) {
  if (!value || value === "Unknown") {
    return [];
  }

  return String(value)
    .split(",")
    .map(d => d.trim())
    .filter(d => d !== "");
}

function cleanSideSwept(value) {
  const sideMap = {
    L: "Left",
    R: "Right"
  };

  return splitList(value).map(side => sideMap[side] || side);
}

function renderPills(values, className = "") {
  if (!values || values.length === 0) {
    return `<span class="detail-pill">Unknown</span>`;
  }

  return values.map(value => `
    <span class="detail-pill ${className}">${escapeHTML(value)}</span>
  `).join("");
}

function renderEmptyDetailPanel() {
  d3.select("#detail-panel").html(`
    <h2 class="detail-panel-title">Selected Street</h2>
    <p class="detail-empty">Click a colored street segment to view its sweeping schedule.</p>
  `);
}

function updateDetailPanel(d) {
  const props = d.properties;
  const details = props.schedule_details;

  if (!details) {
    d3.select("#detail-panel").html(`
      <h2 class="detail-panel-title">Selected Street</h2>

      <section class="detail-section">
        <p class="detail-street-name">${escapeHTML(getStreetName(d))}</p>
        <p class="detail-meta">CNN ${escapeHTML(props.cnn)}</p>
      </section>

      <section class="detail-section">
        <p class="detail-row">
          <strong>Frequency group:</strong> ${escapeHTML(props.frequency_group)}
        </p>
        <p class="detail-empty">No detailed schedule information was found for this street segment.</p>
      </section>
    `);

    return;
  }

  const streetName = escapeHTML(details.corridor);
  const limits = escapeHTML(details.limits);
  const cnn = escapeHTML(details.cnn);
  const monthlyFrequency = escapeHTML(details.monthly_frequency);
  const frequencyGroup = escapeHTML(details.frequency_group);
  const holidaysText = yesNo(details.holidays);
  const holidayClass = holidaysText === "Yes" ? "warning" : "good";
  const daysCleaned = details.days_cleaned;
  const timeRanges = escapeHTML(details.time_ranges);
  const scheduleSummary = escapeHTML(details.schedule_summary);
  const blockSidePills = renderPills(splitList(details.block_sides), "blue");
  const sideSweptPills = renderPills(cleanSideSwept(details.street_sides), "blue");

  d3.select("#detail-panel").html(`
    <h2 class="detail-panel-title">Selected Street</h2>

    <section class="detail-section">
      <p class="detail-street-name">${streetName}</p>
      <p class="detail-limits">${limits}</p>
      <p class="detail-meta">CNN ${cnn}</p>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Quick stats</h3>

      <div class="detail-stat-grid">
        <div class="detail-stat">
          <span class="detail-stat-value">${monthlyFrequency}x</span>
          <span class="detail-stat-label">Estimated sweeps / month</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${frequencyGroup}x</span>
          <span class="detail-stat-label">Frequency group</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${parseDaysCleaned(daysCleaned).length}</span>
          <span class="detail-stat-label">Days cleaned</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${holidaysText}</span>
          <span class="detail-stat-label">Swept on holidays</span>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Cleaning pattern</h3>

      ${renderWeekdayChips(daysCleaned)}

      <span class="time-badge">
        <strong>Time window:</strong> ${timeRanges}
      </span>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Street segment details</h3>

      <p class="detail-row"><strong>Block side</strong></p>
      <div class="detail-pill-row">
        ${blockSidePills}
      </div>

      <p class="detail-row"><strong>Side swept</strong></p>
      <div class="detail-pill-row">
        ${sideSweptPills}
      </div>

      <p class="detail-row"><strong>Holiday sweeping</strong></p>
      <div class="detail-pill-row">
        <span class="detail-pill ${holidayClass}">${holidaysText}</span>
      </div>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Schedule summary</h3>
      <p class="detail-summary">${scheduleSummary}</p>
    </section>

    <p class="detail-footer-note">
      The charts are highlighting this street's matching frequency and time patterns.
    </p>
  `);
}

function updateCombinedSelectionPanel(matchCount) {
  const hasFrequency = activeFrequencyGroup !== null;
  const hasHeatmap = activeHeatmapCells.size > 0;

  const selectedCellsText = hasHeatmap
    ? Array.from(activeHeatmapCells).join(", ")
    : "Any";

  const frequencyText = hasFrequency
    ? `${activeFrequencyGroup}x`
    : "Any";

  d3.select("#detail-panel").html(`
    <h2 class="detail-panel-title">
      ${activeMapMode === "animation" ? "Animated Time Window" : "Combined Selection"}
    </h2>

    <section class="detail-section">
      <h3 class="detail-section-title">Active filters</h3>

      <div class="detail-stat-grid">
        <div class="detail-stat">
          <span class="detail-stat-value">${frequencyText}</span>
          <span class="detail-stat-label">Frequency range</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${matchCount}</span>
          <span class="detail-stat-label">Matching street segments</span>
        </div>
      </div>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Selected time cells</h3>
      <p class="detail-summary">${escapeHTML(selectedCellsText)}</p>
    </section>

    ${hasHeatmap ? `
      <section class="detail-section">
        <h3 class="detail-section-title">Heatmap total</h3>
        <p class="detail-row">
          <strong>${escapeHTML(activeHeatmapValue)}</strong> estimated monthly scheduled occurrences
        </p>
      </section>
    ` : ""}

    <p class="detail-footer-note">
      ${activeMapMode === "animation"
        ? "The map is animating scheduled time windows. Press pause to hold on this moment."
        : "The map highlights streets matching the selected frequency range and at least one selected heatmap cell."}
    </p>
  `);
}

function updateCorridorDetailPanel(corridor, totalFrequency, segmentCount, averageFrequency) {
  d3.select("#detail-panel").html(`
    <h2 class="detail-panel-title">Full Street Selection</h2>

    <section class="detail-section">
      <p class="detail-street-name">${escapeHTML(corridor)}</p>
      <p class="detail-limits">All mapped street segments with this street name are highlighted.</p>
    </section>

    <section class="detail-section">
      <h3 class="detail-section-title">Grouped street stats</h3>

      <div class="detail-stat-grid">
        <div class="detail-stat">
          <span class="detail-stat-value">${escapeHTML(totalFrequency)}x</span>
          <span class="detail-stat-label">Total sweeps / month</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${escapeHTML(segmentCount)}</span>
          <span class="detail-stat-label">Street segments</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">${escapeHTML(averageFrequency)}x</span>
          <span class="detail-stat-label">Average per segment</span>
        </div>

        <div class="detail-stat">
          <span class="detail-stat-value">Street</span>
          <span class="detail-stat-label">Selection type</span>
        </div>
      </div>
    </section>

    <p class="detail-footer-note">
      This groups full streets by name. Click an individual segment on the map to return to segment-level details.
    </p>
  `);
}

/* =========================================================
   MAP SETUP
========================================================= */

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
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7-8",
    "9-12",
    "13-16",
    "17-20",
    "21-28",
    "29-36",
    "37+"
  ];

  const color = d3.scaleOrdinal()
    .domain(order)
    .range([
      "#eef5f7",
      "#e3eff3",
      "#d6e8ee",
      "#c6dde7",
      "#b1d0de",
      "#95bfd1",
      "#79adc3",
      "#6199b5",
      "#4b87a8",
      "#3b7396",
      "#2d6286",
      "#205271",
      "#123b52"
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
    .attr("stroke", "#d9d0bd")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0.78);

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
    .attr("opacity", 0.96)

    .on("mouseover", function(event, d) {
      d3.select(this)
        .raise()
        .attr("stroke", MAP_HIGHLIGHT_COLOR)
        .attr("stroke-width", 4)
        .attr("opacity", 1);

      const details = d.properties.schedule_details;

      tooltip
        .style("display", "block")
        .html(`
          <strong>${escapeHTML(getStreetName(d))}</strong><br>
          ${details && details.limits ? `${escapeHTML(details.limits)}<br>` : ""}
          Estimated sweeps per month: ${details ? escapeHTML(details.monthly_frequency) : escapeHTML(d.properties.frequency_group)}<br>
          Days: ${details ? escapeHTML(details.days_cleaned) : "Unknown"}<br>
          Time: ${details ? escapeHTML(details.time_ranges) : "Unknown"}
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
      if (window.stopHeatmapAnimation) {
        window.stopHeatmapAnimation(true);
      }

      selectedStreet = d;
      activeMapMode = "street";
      activeFrequencyGroup = null;
      activeHeatmapCells = new Set();
      activeHeatmapValue = 0;
      activeCorridor = null;

      applyMapStyles();
      d3.select(this).raise();

      updateDetailPanel(d);
      updateLinkedViews(d);
    });

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)");

  legend.append("text")
    .attr("x", 0)
    .attr("y", -6)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Sweeps / month");

  legend.selectAll("rect")
    .data(order)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 20 + 8)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => color(d));

  legend.selectAll(".legend-label")
    .data(order)
    .enter()
    .append("text")
    .attr("class", "legend-label")
    .attr("x", 20)
    .attr("y", (d, i) => i * 20 + 19)
    .text(d => d)
    .style("font-size", "12px");

  function applyMapStyles() {
    streets
      .interrupt()
      .classed("selected", d => activeMapMode === "street" && selectedStreet === d)
      .transition()
      .duration(activeMapMode === "animation" ? 520 : 180)
      .attr("stroke", d => {
        if (activeMapMode === "street" && selectedStreet === d) {
          return MAP_HIGHLIGHT_COLOR;
        }

        if (activeMapMode === "corridor" && streetMatchesActiveCorridor(d)) {
          return MAP_HIGHLIGHT_COLOR;
        }

        if ((activeMapMode === "filters" || activeMapMode === "animation") && streetMatchesActiveFilters(d)) {
          return MAP_HIGHLIGHT_COLOR;
        }

        return color(d.properties.frequency_group);
      })
      .attr("stroke-width", d => {
        if (activeMapMode === "street" && selectedStreet === d) {
          return 4;
        }

        if (activeMapMode === "corridor" && streetMatchesActiveCorridor(d)) {
          return 3.5;
        }

        if ((activeMapMode === "filters" || activeMapMode === "animation") && streetMatchesActiveFilters(d)) {
          return 3.5;
        }

        if (activeMapMode === "none") {
          return 1.8;
        }

        return 1.2;
      })
      .attr("opacity", d => {
        if (activeMapMode === "none") {
          return 0.96;
        }

        if (activeMapMode === "street") {
          return selectedStreet === d ? 1 : 0.25;
        }

        if (activeMapMode === "corridor") {
          return streetMatchesActiveCorridor(d) ? 1 : 0.12;
        }

        if (activeMapMode === "filters") {
          return streetMatchesActiveFilters(d) ? 1 : 0.12;
        }

        if (activeMapMode === "animation") {
          return streetMatchesActiveFilters(d) ? 1 : 0.08;
        }

        return 0.96;
      });
  }

  function updateFilterPanel() {
    const hasFrequency = activeFrequencyGroup !== null;
    const hasHeatmap = activeHeatmapCells.size > 0;

    if (!hasFrequency && !hasHeatmap) {
      activeMapMode = "none";
      applyMapStyles();
      renderEmptyDetailPanel();
      return;
    }

    activeMapMode = "filters";

    const matchCount = streets
      .data()
      .filter(d => streetMatchesActiveFilters(d))
      .length;

    applyMapStyles();
    updateCombinedSelectionPanel(matchCount);
  }

  window.setFrequencySelection = function(frequencyGroup) {
    if (window.stopHeatmapAnimation) {
      window.stopHeatmapAnimation(true);
    }

    selectedStreet = null;
    activeCorridor = null;
    activeFrequencyGroup = frequencyGroup;

    if (window.resetTopStreetHighlight) {
      window.resetTopStreetHighlight();
    }

    updateFilterPanel();
  };

  window.setHeatmapSelection = function(heatmapCells, heatmapValue) {
    selectedStreet = null;
    activeCorridor = null;
    activeHeatmapValue = heatmapValue || 0;

    activeHeatmapCells = new Set(
      heatmapCells
        .split(",")
        .map(d => d.trim())
        .filter(d => d !== "" && !d.includes("Other"))
    );

    if (window.resetTopStreetHighlight) {
      window.resetTopStreetHighlight();
    }

    updateFilterPanel();
  };

  window.setAnimatedHeatmapSelection = function(heatmapCell, heatmapValue) {
    selectedStreet = null;
    activeCorridor = null;
    activeFrequencyGroup = null;
    activeHeatmapValue = heatmapValue || 0;

    activeHeatmapCells = new Set(
      String(heatmapCell)
        .split(",")
        .map(d => d.trim())
        .filter(d => d !== "" && !d.includes("Other"))
    );

    activeMapMode = "animation";

    if (window.resetTopStreetHighlight) {
      window.resetTopStreetHighlight();
    }

    if (window.resetFrequencyHighlight) {
      window.resetFrequencyHighlight();
    }

    const matchCount = streets
      .data()
      .filter(d => streetMatchesActiveFilters(d))
      .length;

    applyMapStyles();
    updateCombinedSelectionPanel(matchCount);
  };

  window.highlightMapByCorridor = function(corridor, summary) {
    if (window.stopHeatmapAnimation) {
      window.stopHeatmapAnimation(true);
    }

    selectedStreet = null;
    activeMapMode = "corridor";
    activeFrequencyGroup = null;
    activeHeatmapCells = new Set();
    activeHeatmapValue = 0;
    activeCorridor = corridor;

    if (window.resetFrequencyHighlight) {
      window.resetFrequencyHighlight();
    }

    if (window.resetHeatmapHighlight) {
      window.resetHeatmapHighlight();
    }

    const matchingSegments = streets
      .data()
      .filter(d => {
        const details = d.properties.schedule_details;
        return details && details.corridor === corridor;
      });

    const segmentCount = matchingSegments.length;
    const totalFrequency = summary && summary.total_frequency
      ? summary.total_frequency
      : d3.sum(matchingSegments, d => +d.properties.schedule_details.monthly_frequency || 0);

    const averageFrequency = segmentCount > 0
      ? (totalFrequency / segmentCount).toFixed(1)
      : "Unknown";

    applyMapStyles();

    streets
      .filter(d => {
        const details = d.properties.schedule_details;
        return details && details.corridor === corridor;
      })
      .raise();

    updateCorridorDetailPanel(corridor, totalFrequency, segmentCount, averageFrequency);
  };

  window.resetDashboardSelection = function() {
    if (window.stopHeatmapAnimation) {
      window.stopHeatmapAnimation(true);
    }

    selectedStreet = null;
    activeMapMode = "none";
    activeFrequencyGroup = null;
    activeHeatmapCells = new Set();
    activeHeatmapValue = 0;
    activeCorridor = null;

    applyMapStyles();
    renderEmptyDetailPanel();

    if (window.resetFrequencyHighlight) {
      window.resetFrequencyHighlight();
    }

    if (window.resetHeatmapHighlight) {
      window.resetHeatmapHighlight();
    }

    if (window.resetTopStreetHighlight) {
      window.resetTopStreetHighlight();
    }
  };

  d3.select("#reset-selection").on("click", function() {
    window.resetDashboardSelection();
  });

}).catch(error => {
  console.error("Error loading map data:", error);
});
