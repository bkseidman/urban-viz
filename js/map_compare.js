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

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const match = freqMap.get(cnn);

    if (match) {
      feature.properties.monthly_frequency = match.monthly_frequency;
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.monthly_frequency = null;
      feature.properties.frequency_group = "No data";
    }
  });

  drawSimpleMap("#map-simple", geoData);
  drawDetailedMap("#map-detailed", geoData);
}).catch(error => {
  console.error("Error loading comparison map data:", error);
});

function drawSimpleMap(selector, geoData) {
  const svg = d3.select(selector);
  const width = +svg.attr("width");
  const height = +svg.attr("height");

  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  function simplifyGroup(d) {
    const value = d.properties.monthly_frequency;

    if (value == null || Number.isNaN(value)) return "No data";
    if (value <= 20) return "1-20";
    if (value <= 50) return "21-50";
    return "51+";
  }

  const color = d3.scaleOrdinal()
    .domain(["1-20", "21-50", "51+", "No data"])
    .range([
      "#9ecae1",
      "#3182bd",
      "#08519c",
      "#d9d9d9"
    ]);

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

  svg.selectAll(".overlay")
    .data(geoData.features.filter(d => simplifyGroup(d) !== "No data"))
    .enter()
    .append("path")
    .attr("class", "overlay")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => color(simplifyGroup(d)))
    .attr("stroke-width", 1.8)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.95);

  const legendData = ["1-20", "21-50", "51+", "No data"];

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)");

  legend.selectAll("rect")
    .data(legendData)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 22)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(legendData)
    .enter()
    .append("text")
    .attr("x", 20)
    .attr("y", (d, i) => i * 22 + 11)
    .text(d => d);
}

function drawDetailedMap(selector, geoData) {
  const svg = d3.select(selector);
  const width = +svg.attr("width");
  const height = +svg.attr("height");

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
    .attr("opacity", 0.95);

  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)");

  legend.selectAll("rect")
    .data(order)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", (d, i) => i * 18)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => color(d));

  legend.selectAll("text")
    .data(order)
    .enter()
    .append("text")
    .attr("x", 18)
    .attr("y", (d, i) => i * 18 + 10)
    .text(d => d)
    .style("font-size", "11px");
}
