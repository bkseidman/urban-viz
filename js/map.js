const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

function getStreetName(d) {
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

Promise.all([
  d3.json("data/raw/active_streets.geojson"),
  d3.csv("data/processed/cnn_totals.csv")
]).then(([geoData, freqData]) => {

  const freqMap = new Map();

  freqData.forEach(d => {
    freqMap.set(String(d.cnn), {
      frequency_group: d.frequency_group
    });
  });

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const match = freqMap.get(cnn);

    if (match) {
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.frequency_group = "No data";
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

  // Base layer (all streets)
  svg.selectAll(".base")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("class", "base")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 0.8)
    .attr("opacity", 0.7);

  // Overlay layer (only streets with data)
  svg.selectAll(".overlay")
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

      tooltip
        .style("display", "block")
        .html(`
          <strong>${getStreetName(d)}</strong><br>
          Frequency group: ${d.properties.frequency_group}<br>
          CNN: ${d.properties.cnn || "Unknown"}
        `);
    })

    .on("mousemove", function(event) {
      tooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })

    .on("mouseout", function(event, d) {
      d3.select(this)
        .attr("stroke", color(d.properties.frequency_group))
        .attr("stroke-width", 1.8)
        .attr("opacity", 0.95);

      tooltip.style("display", "none");
    });

  // Legend
  const legend = svg.append("g")
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

}).catch(error => {
  console.error("Error loading map data:", error);
});
