const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 54, right: 16, bottom: 102, left: 16 };
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

function labelFontSize(d) {
  const tileWidth = d.x1 - d.x0;
  const tileHeight = d.y1 - d.y0;

  if (tileWidth < 26 || tileHeight < 16) return "7px";
  if (tileWidth < 38 || tileHeight < 22) return "8px";
  if (tileWidth < 55 || tileHeight < 30) return "10px";
  if (tileWidth < 85 || tileHeight < 42) return "12px";
  return "18px";
}

const treemapTooltip = d3.select("body")
  .append("div")
  .attr("id", "treemap-tooltip")
  .style("position", "absolute")
  .style("display", "none")
  .style("pointer-events", "none")
  .style("background", "white")
  .style("border", "1px solid #999")
  .style("border-radius", "6px")
  .style("padding", "8px 10px")
  .style("font-size", "13px")
  .style("line-height", "1.4")
  .style("box-shadow", "0 2px 8px rgba(0, 0, 0, 0.2)")
  .style("z-index", "20");

d3.csv("data/processed/frequency_distribution.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

  // Keep one ordered copy for the legend
  const legendData = [...data].sort(
    (a, b) => frequencyOrder.indexOf(a.frequency) - frequencyOrder.indexOf(b.frequency)
  );

  // Use descending size for the treemap so squarify can make nicer rectangles
  const treemapData = [...data].sort((a, b) => b.count - a.count);

  const root = d3.hierarchy({ children: treemapData })
    .sum(d => d.count)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .tile(d3.treemapSquarify.ratio(1))
    .size([freqInnerWidth, freqInnerHeight])
    .paddingInner(8)
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
    .on("mouseover", function(event, d) {
      d3.select(this).raise();

      treemapTooltip
        .style("display", "block")
        .html(`
          <strong>${d.data.frequency} estimated sweeps/month</strong><br>
          ${formatCount(d.data.count)} street segments
        `);
    })
    .on("mousemove", function(event) {
      treemapTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      treemapTooltip.style("display", "none");
    })
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
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", d => frequencyColor(d.data.frequency))
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .attr("opacity", 0.94);

  // Clip labels so they don't spill outside tiny boxes
  tiles.append("clipPath")
    .attr("id", (d, i) => `treemap-label-clip-${i}`)
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("rx", 6)
    .attr("ry", 6);

  tiles.append("text")
    .attr("class", "treemap-box-label")
    .attr("x", 8)
    .attr("y", 10)
    .attr("dominant-baseline", "hanging")
    .attr("text-anchor", "start")
    .attr("clip-path", (d, i) => `url(#treemap-label-clip-${i})`)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-weight", "bold")
    .style("font-size", d => labelFontSize(d))
    .style("pointer-events", "none")
    .text(d => d.data.frequency);

  freqSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", freqWidth / 2)
    .attr("y", 28)
    .attr("text-anchor", "middle")
    .text("Street Segments by Estimated Sweeps per Month");

  const legendG = freqSvg.append("g")
    .attr("class", "treemap-mini-legend")
    .attr("transform", `translate(${freqMargin.left + 2},${freqHeight - 86})`);

  legendG.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .text("Frequency groups");

  const legendItems = legendG.selectAll(".treemap-legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "treemap-legend-item")
    .attr("data-frequency", d => d.frequency)
    .attr("transform", function(d, i) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      return `translate(${col * 94},${18 + row * 22})`;
    })
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      treemapTooltip
        .style("display", "block")
        .html(`
          <strong>${d.frequency} estimated sweeps/month</strong><br>
          ${formatCount(d.count)} street segments
        `);
    })
    .on("mousemove", function(event) {
      treemapTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      treemapTooltip.style("display", "none");
    })
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
    .attr("width", 12)
    .attr("height", 12)
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => frequencyColor(d.frequency))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.6);

  legendItems.append("text")
    .attr("x", 18)
    .attr("y", 10)
    .style("font-size", "10.5px")
    .style("font-weight", "bold")
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

      return frequency === selectedFrequencyGroup ? 1 : 0.22;
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
      return frequency === selectedFrequencyGroup ? 2 : 0.6;
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
