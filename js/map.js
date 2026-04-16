const svg = d3.select("#map");
const width = +svg.attr("width");
const height = +svg.attr("height");

Promise.all([
  d3.json("data/raw/active_streets.geojson"),
  d3.csv("data/processed/cnn_totals.csv")
]).then(([geoData, freqData]) => {
  console.log("Geo data loaded:", geoData);
  console.log("Frequency data loaded:", freqData.slice(0, 5));

  if (!geoData || !geoData.features) {
    console.error("GeoJSON is missing features");
    return;
  }

  console.log("Number of features:", geoData.features.length);
  console.log("First feature:", geoData.features[0]);
  console.log("First feature properties:", geoData.features[0].properties);
  console.log("First feature geometry:", geoData.features[0].geometry);

  const freqMap = new Map();

  freqData.forEach(d => {
    freqMap.set(String(d.cnn), {
      monthly_frequency: +d.monthly_frequency,
      frequency_group: d.frequency_group
    });
  });

  console.log("Frequency map size:", freqMap.size);

  let matched = 0;

  geoData.features.forEach(feature => {
    const cnn = String(feature.properties.cnn);
    const match = freqMap.get(cnn);

    if (match) {
      matched++;
      feature.properties.monthly_frequency = match.monthly_frequency;
      feature.properties.frequency_group = match.frequency_group;
    } else {
      feature.properties.monthly_frequency = null;
      feature.properties.frequency_group = "No data";
    }
  });

  console.log("Matched features:", matched);

  const projection = d3.geoMercator()
    .fitSize([width, height], geoData);

  const path = d3.geoPath().projection(projection);

  console.log("Sample path output:", path(geoData.features[0]));

  const color = d3.scaleOrdinal()
    .domain(["1-20", "21-40", "41-60", "61-80", "81+", "No data"])
    .range(["#dbe9f6", "#9ecae1", "#6baed6", "#3182bd", "#08519c", "#cccccc"]);

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

  console.log("Paths appended:", geoData.features.length);
}).catch(error => {
  console.error("Error loading map data:", error);
});
