const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

Promise.all([
  d3.json("data/raw/Streets_-_Active_and_Retired_20260416.geojson"),
  d3.csv("data/processed/cnn_totals.csv")
]).then(([geoData, freqData]) => {

  // Build lookup map from CSV
  const freqMap = new Map();
  freqData.forEach(d => {
    freqMap.set(String(d.cnn), {
      monthly_frequency: +d.monthly_frequency,
      frequency_group: d.frequency_group
    });
  });

  // Attach frequency data to geo features
  let matched = 0;

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const match = freqMap.get(cnn);

    if (match) {
      matched++;
      feature.properties.monthly_frequency = match.monthly_frequency;
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.frequency_group = "No data";
    }
  });

  console.log("Matched features:", matched);

  // Projection + path
  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  // Simplified color scale (better for map)
  const color = d3.scaleOrdinal()
    .domain(["1-20", "21-40", "41-60", "61-80", "81+", "No data"])
    .range([
      "#dbe9f6",
      "#9ecae1",
      "#6baed6",
      "#3182bd",
      "#08519c",
      "#cccccc"
    ]);

  // Draw streets
  svg.selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => color(d.properties.frequency_group))
    .attr("stroke-width", 1.2)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.9);

  // Legend
  const legendData = ["1-20", "21-40", "41-60", "61-80", "81+", "No data"];

  const legend = svg.append("g")
    .attr("transform", "translate(20,20)");

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 22)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 24)
    .attr("y", (d, i) => i * 22 + 13)
    .text(d => d);

}).catch(error => {
  console.error("Error loading map data:", error);
});
