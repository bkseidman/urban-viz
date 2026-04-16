const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

Promise.all([
  d3.json("data/raw/active_streets.geojson"),
  d3.csv("data/processed/cnn_totals.csv")
]).then(([geoData, freqData]) => {
  const freqMap = new Map();

  freqData.forEach(d => {
    freqMap.set(String(d.cnn), {
      monthly_frequency: +d.monthly_frequency,
      frequency_group: d.frequency_group
    });
  });

  let matched = 0;

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const match = freqMap.get(cnn);

    if (match) {
      matched++;
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.frequency_group = "No data";
    }
  });

  console.log("Matched features:", matched);

  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  const color = d3.scaleOrdinal()
    .domain(["1-20", "21-50", "51+"])
    .range([
      "#9ecae1",
      "#3182bd",
      "#08519c"
    ]);

  // Background streets: all streets in light gray
  svg.selectAll(".base-street")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("class", "base-street")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", "#d9d9d9")
    .attr("stroke-width", 1)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.7);

  // Overlay only matched streets with stronger colors
  svg.selectAll(".sweep-street")
    .data(geoData.features.filter(d => d.properties.frequency_group !== "No data"))
    .enter()
    .append("path")
    .attr("class", "sweep-street")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => color(d.properties.frequency_group))
    .attr("stroke-width", 1.8)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.95);

  // Legend
  const legendData = ["1-20", "21-50", "51+"];

  const legend = svg.append("g")
    .attr("transform", "translate(20,20)");

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 24)
    .attr("width", 16)
    .attr("height", 16)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 24)
    .attr("y", (d, i) => i * 24 + 13)
    .text(d => d);

}).catch(error => {
  console.error("Error loading map data:", error);
});
