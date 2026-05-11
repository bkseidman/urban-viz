const freqSvg = d3.select("#chart");
const freqWidth = +freqSvg.attr("width");
const freqHeight = +freqSvg.attr("height");

const freqMargin = { top: 42, right: 10, bottom: 88, left: 10 };
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

function tileWidth(d) {
  return d.x1 - d.x0;
}

function tileHeight(d) {
  return d.y1 - d.y0;
}

function boxLabelText(d) {
  return `${d.data.frequency}x`;
}

function labelFontSize(d) {
  const frequency = d.data.frequency;
  const w = tileWidth(d);
  const h = tileHeight(d);

  if (frequency === "37+") return "7px";
  if (frequency === "21-28") return "8px";
  if (frequency === "13-16") return "9px";

  if (w < 28 || h < 18) return "7px";
  if (w < 42 || h < 24) return "8px";
  if (w < 60 || h < 32) return "9px";
  if (w < 88 || h < 40) return "11px";
  if (w < 130 || h < 56) return "13px";
  return "18px";
}

function labelWeight(d) {
  const frequency = d.data.frequency;

  if (frequency === "37+" || frequency === "21-28") {
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
    .attr("width", d => tileWidth(d))
    .attr("height", d => tileHeight(d))
    .attr("fill", d => frequencyColor(d.data.frequency))
    .attr("stroke", "#ffffff")
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

  const legendG = freqSvg.append("g")
    .attr("class", "treemap-mini-legend")
    .attr("transform", `translate(${freqMargin.left},${freqHeight - 72})`);

  legendG.append("text")
    .attr("x", 0)
    .attr("y", 0)
    .style("font-size", "11px")
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
      return `translate(${col * 118},${17 + row * 17})`;
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
    .attr("width", 11)
    .attr("height", 11)
    .attr("rx", 2)
    .attr("ry", 2)
    .attr("fill", d => frequencyColor(d.frequency))
    .attr("stroke", "#999")
    .attr("stroke-width", 0.6);

  legendItems.append("text")
    .attr("x", 17)
    .attr("y", 9.5)
    .style("font-size", "10px")
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

      return frequency === selectedFrequencyGroup ? 1 : 0.25;
    });

  d3.selectAll(".freq-tile rect")
    .attr("stroke", function() {
      const frequency = d3.select(this.parentNode).attr("data-frequency");
      return frequency === selectedFrequencyGroup ? "#e60000" : "#ffffff";
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
      return frequency === selectedFrequencyGroup ? "#e60000" : "#999";
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
