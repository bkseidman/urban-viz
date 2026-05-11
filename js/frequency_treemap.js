const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 54, right: 16, bottom: 42, left: 16 };
const freqInnerWidth = freqWidth - freqMargin.left - freqMargin.right;
const freqInnerHeight = freqHeight - freqMargin.top - freqMargin.bottom;

const freqG = freqSvg.append("g")
  .attr("transform", `translate(${freqMargin.left},${freqMargin.top})`);

let selectedFrequencyGroup = null;

const frequencyOrder = [
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

const frequencyColor = d3.scaleOrdinal()
  .domain(frequencyOrder)
  .range([
    "#f7fbff",
    "#eaf4fb",
    "#dceef8",
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

function formatCount(value) {
  return d3.format(",")(value);
}

function readableTextColor(frequency) {
  const darkGroups = new Set(["17-20", "21-28", "29-36", "37+"]);
  return darkGroups.has(frequency) ? "white" : "#111";
}

d3.csv("data/processed/frequency_distribution.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

  data.sort((a, b) => frequencyOrder.indexOf(a.frequency) - frequencyOrder.indexOf(b.frequency));

  const root = d3.hierarchy({ children: data })
    .sum(d => d.count)
    .sort((a, b) => frequencyOrder.indexOf(a.data.frequency) - frequencyOrder.indexOf(b.data.frequency));

  d3.treemap()
    .size([freqInnerWidth, freqInnerHeight])
    .paddingInner(4)
    .paddingOuter(2)
    .round(true)(root);

  const tiles = freqG.selectAll(".freq-tile")
    .data(root.leaves())
    .enter()
    .append("g")
    .attr("class", "freq-tile")
    .attr("data-frequency", d => d.data.frequency)
    .attr("transform", d => `translate(${d.x0},${d.y0})`)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (selectedFrequencyGroup === d.data.frequency) {
        selectedFrequencyGroup = null;
      } else {
        selectedFrequencyGroup = d.data.frequency;
      }

      updateFrequencySelection();

      if (window.setFrequencySelection) {
        window.setFrequencySelection(selectedFrequencyGroup);
      }
    });

  tiles.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", d => frequencyColor(d.data.frequency))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("opacity", 0.9);

  tiles.append("title")
    .text(d => `${d.data.frequency} estimated sweeps/month\n${formatCount(d.data.count)} street segments`);

  tiles.append("text")
    .attr("class", "treemap-frequency-label")
    .attr("x", 8)
    .attr("y", 20)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-weight", "bold")
    .style("font-size", "15px")
    .text(d => d.data.frequency)
    .style("display", d => (d.x1 - d.x0 > 38 && d.y1 - d.y0 > 34) ? "block" : "none");

  tiles.append("text")
    .attr("class", "treemap-count-label")
    .attr("x", 8)
    .attr("y", 39)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-size", "12px")
    .text(d => formatCount(d.data.count))
    .style("display", d => (d.x1 - d.x0 > 58 && d.y1 - d.y0 > 54) ? "block" : "none");

  freqSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", freqWidth / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .text("Street Segments by Estimated Sweeps per Month");

  freqSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", freqWidth / 2)
    .attr("y", freqHeight - 14)
    .attr("text-anchor", "middle")
    .text("Area = number of street segments; color = estimated sweeps/month group");

}).catch(error => {
  console.error("Error loading frequency treemap data:", error);
});

function updateFrequencySelection() {
  d3.selectAll(".freq-tile")
    .attr("opacity", function() {
      const frequency = d3.select(this).attr("data-frequency");

      if (!selectedFrequencyGroup) {
        return 1;
      }

      return frequency === selectedFrequencyGroup ? 1 : 0.25;
    });

  d3.selectAll(".freq-tile rect")
    .attr("stroke", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? "#000" : "white";
    })
    .attr("stroke-width", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? 3 : 2;
    });
}

window.highlightFrequencyGroup = function(frequencyGroup) {
  selectedFrequencyGroup = frequencyGroup;
  updateFrequencySelection();
};

window.resetFrequencyHighlight = function() {
  selectedFrequencyGroup = null;
  updateFrequencySelection();
};
