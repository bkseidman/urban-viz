const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 60, right: 30, bottom: 80, left: 80 };
const freqInnerWidth = freqWidth - freqMargin.left - freqMargin.right;
const freqInnerHeight = freqHeight - freqMargin.top - freqMargin.bottom;

const freqG = freqSvg.append("g")
  .attr("transform", `translate(${freqMargin.left},${freqMargin.top})`);

let selectedFrequencyGroup = null;

d3.csv("data/processed/frequency_distribution.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

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
    .attr("fill", "steelblue")
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (selectedFrequencyGroup === d.frequency) {
        selectedFrequencyGroup = null;
      } else {
        selectedFrequencyGroup = d.frequency;
      }

      updateFrequencySelection();

      if (window.setFrequencySelection) {
        window.setFrequencySelection(selectedFrequencyGroup);
      }
    });

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
    .text("Street Segments by Estimated Sweeps per Month");

  freqSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", freqWidth / 2)
    .attr("y", freqHeight - 20)
    .attr("text-anchor", "middle")
    .text("Estimated Sweeps per Month");

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

function updateFrequencySelection() {
  d3.selectAll(".freq-bar")
    .attr("opacity", d => {
      if (!selectedFrequencyGroup) {
        return 0.85;
      }

      return d.frequency === selectedFrequencyGroup ? 1 : 0.25;
    })
    .attr("stroke", d => d.frequency === selectedFrequencyGroup ? "#000" : "none")
    .attr("stroke-width", d => d.frequency === selectedFrequencyGroup ? 3 : 0);
}

window.highlightFrequencyGroup = function(frequencyGroup) {
  selectedFrequencyGroup = frequencyGroup;
  updateFrequencySelection();
};

window.resetFrequencyHighlight = function() {
  selectedFrequencyGroup = null;
  updateFrequencySelection();
};
