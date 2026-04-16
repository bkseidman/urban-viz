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

  geoData.features.forEach(feature => {
    const cnn = String(
      feature.properties.CNN ??
      feature.properties.cnn ??
      feature.properties.Cnn ?? ""
    );

    const match = freqMap.get(cnn);

    if (match) {
      feature.properties.monthly_frequency = match.monthly_frequency;
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.monthly_frequency = null;
      feature.properties.frequency_group = "No data";
    }
  });

  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  const color = d3.scaleOrdinal()
    .domain([
      "1-10",
      "11-20",
      "21-30",
      "31-40",
      "41-50",
      "51-60",
      "61-70",
      "71-80",
      "81-90",
      "91-100",
      "101+",
      "No data"
    ])
    .range([
      "#edf8fb",
      "#d6eef5",
      "#bde2ec",
      "#9fd3df",
      "#7fc2d2",
      "#5eaec2",
      "#4292b2",
      "#2b7b9f",
      "#1f6488",
      "#154d70",
      "#0d3557",
      "#cccccc"
    ]);

  svg.selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "none")
    .attr("stroke", d => color(d.properties.frequency_group))
    .attr("stroke-width", 1)
    .attr("stroke-linecap", "round")
    .attr("opacity", 0.9);

  const legendData = [
    "1-10",
    "11-20",
    "21-30",
    "31-40",
    "41-50",
    "51-60",
    "61-70",
    "71-80",
    "81-90",
    "91-100",
    "101+",
    "No data"
  ];

  const legend = svg.append("g")
    .attr("class", "legend")
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
