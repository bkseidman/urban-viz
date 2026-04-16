const svg2 = d3.select("#heatmap");
const width2 = +svg2.attr("width");
const height2 = +svg2.attr("height");

const margin2 = { top: 60, right: 30, bottom: 70, left: 90 };
const innerWidth2 = width2 - margin2.left - margin2.right;
const innerHeight2 = height2 - margin2.top - margin2.bottom;

const g2 = svg2.append("g")
  .attr("transform", `translate(${margin2.left},${margin2.top})`);

d3.csv("data/processed/time_heatmap.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

  const weekdayOrder = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const timeOrder = ["6-8", "8-10", "10-12", "12-14"];

  const x = d3.scaleBand()
    .domain(weekdayOrder)
    .range([0, innerWidth2])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(timeOrder)
    .range([0, innerHeight2])
    .padding(0.05);

  const color = d3.scaleSequential()
    .domain([0, d3.max(data, d => d.count)])
    .interpolator(d3.interpolateBlues);

  g2.append("g")
    .attr("transform", `translate(0,${innerHeight2})`)
    .call(d3.axisBottom(x));

  g2.append("g")
    .call(d3.axisLeft(y));

  g2.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.weekday))
    .attr("y", d => y(d.time_bucket))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.count));

  g2.selectAll(".cell-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", d => x(d.weekday) + x.bandwidth() / 2)
    .attr("y", d => y(d.time_bucket) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text(d => d.count);

  svg2.append("text")
    .attr("class", "chart-title")
    .attr("x", width2 / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Street Sweeping by Weekday and Time");

  svg2.append("text")
    .attr("class", "axis-label")
    .attr("x", width2 / 2)
    .attr("y", height2 - 15)
    .attr("text-anchor", "middle")
    .text("Weekday");

  svg2.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height2 / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .text("Time Bucket");
}).catch(error => {
  console.error("Error loading heatmap data:", error);
});
