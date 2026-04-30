const heatSvg = d3.select("#heatmap");
const heatWidth = +heatSvg.attr("width");
const heatHeight = +heatSvg.attr("height");

const heatMargin = { top: 60, right: 30, bottom: 70, left: 90 };
const heatInnerWidth = heatWidth - heatMargin.left - heatMargin.right;
const heatInnerHeight = heatHeight - heatMargin.top - heatMargin.bottom;

const heatG = heatSvg.append("g")
  .attr("transform", `translate(${heatMargin.left},${heatMargin.top})`);

let selectedHeatmapCells = new Set();
let heatmapValueByCell = new Map();

function updateHeatmapSelection() {
  d3.selectAll(".heatmap-cell")
    .attr("opacity", function() {
      const cell = d3.select(this).attr("data-cell");

      if (selectedHeatmapCells.size === 0) {
        return 0.9;
      }

      return selectedHeatmapCells.has(cell) ? 1 : 0.25;
    })
    .attr("stroke", function() {
      const cell = d3.select(this).attr("data-cell");
      return selectedHeatmapCells.has(cell) ? "#000" : "none";
    })
    .attr("stroke-width", function() {
      const cell = d3.select(this).attr("data-cell");
      return selectedHeatmapCells.has(cell) ? 3 : 0;
    });
}

function selectedHeatmapValueTotal() {
  let total = 0;

  selectedHeatmapCells.forEach(cell => {
    total += heatmapValueByCell.get(cell) || 0;
  });

  return total;
}

d3.csv("data/processed/time_heatmap.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
    heatmapValueByCell.set(`${d.weekday}|${d.time_bucket}`, d.count);
  });

  const weekdayOrder = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const timeOrder = ["12-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14"];

  const x = d3.scaleBand()
    .domain(weekdayOrder)
    .range([0, heatInnerWidth])
    .padding(0.05);

  const y = d3.scaleBand()
    .domain(timeOrder)
    .range([0, heatInnerHeight])
    .padding(0.05);

  const color = d3.scaleSequential()
    .domain([0, d3.max(data, d => d.count)])
    .interpolator(d3.interpolateBlues);

  heatG.append("g")
    .attr("transform", `translate(0,${heatInnerHeight})`)
    .call(d3.axisBottom(x));

  heatG.append("g")
    .call(d3.axisLeft(y));

  heatG.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("data-cell", d => `${d.weekday}|${d.time_bucket}`)
    .attr("x", d => x(d.weekday))
    .attr("y", d => y(d.time_bucket))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.count))
    .attr("opacity", 0.9)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      const selectedCell = `${d.weekday}|${d.time_bucket}`;

      if (selectedHeatmapCells.has(selectedCell)) {
        selectedHeatmapCells.delete(selectedCell);
      } else {
        selectedHeatmapCells.add(selectedCell);
      }

      updateHeatmapSelection();

      if (selectedHeatmapCells.size === 0) {
        if (window.resetDashboardSelection) {
          window.resetDashboardSelection();
        }
        return;
      }

      const selectedCellList = Array.from(selectedHeatmapCells).join(", ");
      const selectedTotal = selectedHeatmapValueTotal();

      if (window.highlightMapByHeatmapCells) {
        window.highlightMapByHeatmapCells(selectedCellList, selectedTotal);
      }
    });

  heatG.selectAll(".cell-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "cell-label")
    .attr("x", d => x(d.weekday) + x.bandwidth() / 2)
    .attr("y", d => y(d.time_bucket) + y.bandwidth() / 2 + 4)
    .attr("text-anchor", "middle")
    .text(d => d.count);

  heatSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", heatWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .text("Scheduled Sweeping Occurrences by Weekday and Time");

  heatSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", heatWidth / 2)
    .attr("y", heatHeight - 15)
    .attr("text-anchor", "middle")
    .text("Weekday");

  heatSvg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -heatHeight / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .text("Time Bucket");

}).catch(error => {
  console.error("Error loading heatmap data:", error);
});

window.highlightHeatmapCells = function(heatmapCells) {
  if (!heatmapCells) {
    return;
  }

  selectedHeatmapCells = new Set(
    heatmapCells
      .split(",")
      .map(d => d.trim())
      .filter(d => d !== "" && !d.includes("Other"))
  );

  updateHeatmapSelection();
};

window.resetHeatmapHighlight = function() {
  selectedHeatmapCells = new Set();

  d3.selectAll(".heatmap-cell")
    .attr("opacity", 0.9)
    .attr("stroke", "none")
    .attr("stroke-width", 0);
};
