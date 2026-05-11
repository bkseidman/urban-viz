const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 54, right: 16, bottom: 92, left: 16 };
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
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .tile(d3.treemapSquarify.ratio(1.15))
    .size([freqInnerWidth, freqInnerHeight])
    .paddingInner(5)
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
    .attr("rx", 5)
    .attr("ry", 5)
    .attr("fill", d => frequencyColor(d.data.frequency))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("opacity", 0.92);

  tiles.append("title")
    .text(d => `${d.data.frequency} estimated sweeps/month\n${formatCount(d.data.count)} street segments`);

  tiles.append("text")
    .attr("class", "treemap-frequency-label")
    .attr("x", 9)
    .attr("y", 23)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-weight", "bold")
    .style("font-size", "18px")
    .text(d => d.data.frequency)
    .style("display", d => {
      const tileWidth = d.x1 - d.x0;
      const tileHeight = d.y1 - d.y0;

      return tileWidth > 62 && tileHeight > 44 ? "block" : "none";
    });

  tiles.append("text")
    .attr("class", "treemap-count-label")
    .attr("x", 9)
    .attr("y", 46)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-size", "14px")
    .text(d => formatCount(d.data.count))
    .style("display", d => {
      const tileWidth = d.x1 - d.x0;
      const tileHeight = d.y1 - d.y0;

      return tileWidth > 76 && tileHeight > 64 ? "block" : "none";
    });

  freqSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", freqWidth / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .text("Street Segments by Estimated Sweeps per Month");

  const legendG = freqSvg.append("g")
    .attr("class", "treemap-mini-legend")
    .attr("transform", `translate(${freqMargin.left},${freqHeight - 76})`);

  legendG.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "11px")
    .style("font-weight", "bold")
    .text("Frequency groups");

  const legendItems = legendG.selectAll(".treemap-legend-item")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "treemap-legend-item")
    .attr("data-frequency", d => d.frequency)
    .attr("transform", function(d, i) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      return `translate(${col * 93},${16 + row * 20})`;
    })
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

  legendItems.append("rect")
    .attr("width", 11)
    .attr("height", 11)
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => frequencyColor(d.frequency))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.5);

  legendItems.append("text")
    .attr("x", 16)
    .attr("y", 10)
    .style("font-size", "10px")
    .text(d => `${d.frequency}: ${formatCount(d.count)}`);

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

  d3.selectAll(".treemap-legend-item")
    .attr("opacity", function() {
      const frequency = d3.select(this).attr("data-frequency");

      if (!selectedFrequencyGroup) {
        return 1;
      }

      return frequency === selectedFrequencyGroup ? 1 : 0.35;
    });

  d3.selectAll(".treemap-legend-item rect")
    .attr("stroke", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? "#000" : "#999";
    })
    .attr("stroke-width", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? 2 : 0.5;
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
