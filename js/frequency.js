const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 60, right: 30, bottom: 80, left: 80 };
const freqInnerWidth = freqWidth - freqMargin.left - freqMargin.right;
const freqInnerHeight = freqHeight - freqMargin.top - freqMargin.bottom;

const freqG = freqSvg.append("g")
  .attr("transform", `translate(${freqMargin.left},${freqMargin.top})`);

d3.csv("data/processed/frequency_distribution.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

  const order = [
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
    "101+"
  ];

  data.sort((a, b) => order.indexOf(a.frequency) - order.indexOf(b.frequency));

  const x = d3.scaleBand()
    .domain(order)
    .range([0, freqInnerWidth])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .nice()
    .range([freqInnerHeight, 0]);

  freqG.append("g")
    .attr("transform", `translate(0,${freqInnerHeight})`)
    .call(d3.axisBottom(x));

  freqG.append("g")
    .call(d3.axisLeft(y));

  freqG.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "freq-bar")
    .attr("data-frequency", d => d.frequency)
    .attr("x", d => x(d.frequency))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => freqInnerHeight - y(d.count))
    .attr("fill", "steelblue");

  freqG.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.frequency) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .text(d => d.count);

  freqSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", freqWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Street Segment Sweeping Frequency");

  freqSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", freqWidth / 2)
    .attr("y", freqHeight - 20)
    .attr("text-anchor", "middle")
    .text("Monthly Frequency Group");

  freqSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -freqHeight / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .text("Number of Street Segments");
}).catch(error => {
  console.error("Error loading frequency data:", error);
});
