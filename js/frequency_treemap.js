const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

// More bottom margin = dedicated space for the legend.
// This keeps the treemap from getting cut off at the bottom.
const freqMargin = { top: 38, right: 10, bottom: 62, left: 10 };
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
    "#f7f3ea",
    "#edf3f4",
    "#dfecef",
    "#cfe2ea",
    "#b9d5e1",
    "#9fc2d2",
    "#82aeca",
    "#6798bc",
    "#4c84af",
    "#3c73a0",
    "#2d618e",
    "#1f4f79",
    "#123b52"
  ]);

function formatCount(value) {
  return d3.format(",")(value);
}

function readableTextColor(frequency) {
  const darkGroups = new Set(["17-20", "21-28", "29-36", "37+"]);
  return darkGroups.has(frequency) ? "white" : "#123b52";
}

function tileWidth(d) {
  return d.x1 - d.x0;
}

function tileHeight(d) {
  return d.y1 - d.y0;
}

function boxLabelText(d) {
  return `${d.data.frequency}x`;
}

function legendLabelText(d) {
  return `${d.frequency}x`;
}

function labelFontSize(d) {
  const frequency = d.data.frequency;
  const w = tileWidth(d);
  const h = tileHeight(d);

  // Custom fixes for tiny boxes.
  if (frequency === "37+") return "6.5px";
  if (frequency === "21-28") return "7.5px";
  if (frequency === "13-16") return "8px";
  if (frequency === "9-12") return "9px";

  if (w < 28 || h < 18) return "6.5px";
  if (w < 42 || h < 24) return "7.5px";
  if (w < 60 || h < 32) return "8.5px";
  if (w < 88 || h < 40) return "10px";
  if (w < 130 || h < 56) return "12px";
  return "17px";
}

function labelWeight(d) {
  const frequency = d.data.frequency;

  if (frequency === "37+" || frequency === "21-28" || frequency === "13-16") {
    return "700";
  }

  return "800";
}

const treemapTooltip = d3.select("body")
  .append("div")
  .attr("id", "treemap-tooltip")
  .style("position", "absolute")
  .style("display", "none")
  .style("pointer-events", "none")
  .style("background", "rgba(255, 251, 244, 0.98)")
  .style("border", "1px solid #d8cdb8")
  .style("border-radius", "10px")
  .style("padding", "8px 10px")
  .style("font-size", "13px")
  .style("line-height", "1.4")
  .style("box-shadow", "0 10px 22px rgba(36, 49, 60, 0.14)")
  .style("z-index", "20")
  .style("color", "#1f3140");

d3.csv("data/processed/frequency_distribution.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
  });

  const legendData = [...data].sort(
    (a, b) => frequencyOrder.indexOf(a.frequency) - frequencyOrder.indexOf(b.frequency)
  );

  const treemapData = [...data].sort((a, b) => b.count - a.count);

  const root = d3.hierarchy({ children: treemapData })
    .sum(d => d.count)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .tile(d3.treemapSquarify.ratio(1))
    .size([freqInnerWidth, freqInnerHeight])
    .paddingInner(0)
    .paddingOuter(0)
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
          <strong>${d.data.frequency} times/month</strong><br>
          ${formatCount(d.data.count)} street segments<br>
          Click to highlight matching streets on the map.
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
    .attr("width", d => tileWidth(d))
    .attr("height", d => tileHeight(d))
    .attr("fill", d => frequencyColor(d.data.frequency))
    .attr("stroke", "#fffaf2")
    .attr("stroke-width", 1);

  tiles.append("clipPath")
    .attr("id", (d, i) => `treemap-label-clip-${i}`)
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", d => Math.max(0, tileWidth(d)))
    .attr("height", d => Math.max(0, tileHeight(d)));

  tiles.append("text")
    .attr("class", "treemap-box-label")
    .attr("x", d => tileWidth(d) / 2)
    .attr("y", d => tileHeight(d) / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "middle")
    .attr("clip-path", (d, i) => `url(#treemap-label-clip-${i})`)
    .attr("fill", d => readableTextColor(d.data.frequency))
    .style("font-weight", d => labelWeight(d))
    .style("font-size", d => labelFontSize(d))
    .style("pointer-events", "none")
    .text(d => boxLabelText(d));

  freqSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", freqWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Street Segments by Estimated Sweeps per Month");

  // Compact legend, inside the reserved bottom space.
  const legendG = freqSvg.append("g")
    .attr("class", "treemap-mini-legend")
    .attr("transform", `translate(${freqMargin.left},${freqHeight - 48})`);

  legendG.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "10.5px")
    .style("font-weight", "bold")
    .style("fill", "#123b52")
    .text("Frequency groups");

  const legendItems = legendG.selectAll(".treemap-legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "treemap-legend-item")
    .attr("data-frequency", d => d.frequency)
    .attr("transform", function(d, i) {
      const col = i % 7;
      const row = Math.floor(i / 7);
      return `translate(${col * 82},${14 + row * 16})`;
    })
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      treemapTooltip
        .style("display", "block")
        .html(`
          <strong>${d.frequency} times/month</strong><br>
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
    .attr("width", 10)
    .attr("height", 10)
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => frequencyColor(d.frequency))
    .attr("stroke", "#8ca0ac")
    .attr("stroke-width", 0.6);

  legendItems.append("text")
    .attr("x", 15)
    .attr("y", 8.8)
    .style("font-size", "9.5px")
    .style("font-weight", "bold")
    .style("fill", "#123b52")
    .text(d => legendLabelText(d));

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
      return frequency === selectedFrequencyGroup ? "#8d5aa7" : "#fffaf2";
    })
    .attr("stroke-width", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? 2 : 1;
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
      return frequency === selectedFrequencyGroup ? "#8d5aa7" : "#8ca0ac";
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
