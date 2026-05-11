const heatSvg = d3.select("#heatmap");
const heatWidth = +heatSvg.attr("width");
const heatHeight = +heatSvg.attr("height");

const HEATMAP_HIGHLIGHT_COLOR = "#e60000";

const heatMargin = { top: 60, right: 22, bottom: 72, left: 110 };
const heatInnerWidth = heatWidth - heatMargin.left - heatMargin.right;
const heatInnerHeight = heatHeight - heatMargin.top - heatMargin.bottom;

const heatG = heatSvg.append("g")
  .attr("transform", `translate(${heatMargin.left},${heatMargin.top})`);

let selectedHeatmapCells = new Set();
let heatmapValueByCell = new Map();
let heatmapData = [];

const weekdayOrder = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeOrder = ["12-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14"];

const weekdayDisplay = {
  Mon: "Monday",
  Tues: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday"
};

const timeDisplay = {
  "12-2": "12–2 AM",
  "2-4": "2–4 AM",
  "4-6": "4–6 AM",
  "6-8": "6–8 AM",
  "8-10": "8–10 AM",
  "10-12": "10 AM–12 PM",
  "12-14": "12–2 PM"
};

const heatmapTooltip = d3.select("body")
  .append("div")
  .attr("id", "heatmap-tooltip")
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

function cellKey(weekday, timeBucket) {
  return `${weekday}|${timeBucket}`;
}

function selectedHeatmapValueTotal() {
  let total = 0;

  selectedHeatmapCells.forEach(cell => {
    total += heatmapValueByCell.get(cell) || 0;
  });

  return total;
}

function pushHeatmapSelectionToDashboard() {
  const selectedCellList = Array.from(selectedHeatmapCells).join(", ");
  const selectedTotal = selectedHeatmapValueTotal();

  if (window.setHeatmapSelection) {
    window.setHeatmapSelection(selectedCellList, selectedTotal);
  }
}

function rowIsActive(timeBucket) {
  const rowCells = heatmapData
    .filter(d => d.time_bucket === timeBucket)
    .map(d => cellKey(d.weekday, d.time_bucket));

  return rowCells.some(cell => selectedHeatmapCells.has(cell));
}

function columnIsActive(weekday) {
  const colCells = heatmapData
    .filter(d => d.weekday === weekday)
    .map(d => cellKey(d.weekday, d.time_bucket));

  return colCells.some(cell => selectedHeatmapCells.has(cell));
}

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
      return selectedHeatmapCells.has(cell) ? HEATMAP_HIGHLIGHT_COLOR : "none";
    })
    .attr("stroke-width", function() {
      const cell = d3.select(this).attr("data-cell");
      return selectedHeatmapCells.has(cell) ? 3 : 0;
    });

  d3.selectAll(".weekday-axis-label")
    .attr("fill", d => columnIsActive(d) ? HEATMAP_HIGHLIGHT_COLOR : "#222")
    .style("font-weight", d => columnIsActive(d) ? "700" : "400");

  d3.selectAll(".time-axis-label")
    .attr("fill", d => rowIsActive(d) ? HEATMAP_HIGHLIGHT_COLOR : "#222")
    .style("font-weight", d => rowIsActive(d) ? "700" : "400");
}

function toggleSingleCell(cell) {
  if (selectedHeatmapCells.has(cell)) {
    selectedHeatmapCells.delete(cell);
  } else {
    selectedHeatmapCells.add(cell);
  }

  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

function toggleWeekdaySelection(weekday) {
  const matchingCells = heatmapData
    .filter(d => d.weekday === weekday)
    .map(d => cellKey(d.weekday, d.time_bucket));

  const allSelected = matchingCells.every(cell => selectedHeatmapCells.has(cell));

  if (allSelected) {
    matchingCells.forEach(cell => selectedHeatmapCells.delete(cell));
  } else {
    matchingCells.forEach(cell => selectedHeatmapCells.add(cell));
  }

  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

function toggleTimeSelection(timeBucket) {
  const matchingCells = heatmapData
    .filter(d => d.time_bucket === timeBucket)
    .map(d => cellKey(d.weekday, d.time_bucket));

  const allSelected = matchingCells.every(cell => selectedHeatmapCells.has(cell));

  if (allSelected) {
    matchingCells.forEach(cell => selectedHeatmapCells.delete(cell));
  } else {
    matchingCells.forEach(cell => selectedHeatmapCells.add(cell));
  }

  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

d3.csv("data/processed/time_heatmap.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
    heatmapValueByCell.set(cellKey(d.weekday, d.time_bucket), d.count);
  });

  heatmapData = data;

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

  const xAxisG = heatG.append("g")
    .attr("transform", `translate(0,${heatInnerHeight})`)
    .call(d3.axisBottom(x));

  const yAxisG = heatG.append("g")
    .call(
      d3.axisLeft(y)
        .tickFormat(d => timeDisplay[d] || d)
    );

  xAxisG.selectAll(".tick text")
    .attr("class", "weekday-axis-label")
    .style("cursor", "pointer")
    .on("mouseover", function(event, weekday) {
      heatmapTooltip
        .style("display", "block")
        .html(`
          <strong>${weekdayDisplay[weekday] || weekday}</strong><br>
          Click to select or deselect all time buckets for this day.
        `);
    })
    .on("mousemove", function(event) {
      heatmapTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      heatmapTooltip.style("display", "none");
    })
    .on("click", function(event, weekday) {
      toggleWeekdaySelection(weekday);
    });

  yAxisG.selectAll(".tick text")
    .attr("class", "time-axis-label")
    .style("cursor", "pointer")
    .on("mouseover", function(event, timeBucket) {
      heatmapTooltip
        .style("display", "block")
        .html(`
          <strong>${timeDisplay[timeBucket] || timeBucket}</strong><br>
          Click to select or deselect this full time row across all days.
        `);
    })
    .on("mousemove", function(event) {
      heatmapTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      heatmapTooltip.style("display", "none");
    })
    .on("click", function(event, timeBucket) {
      toggleTimeSelection(timeBucket);
    });

  heatG.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "heatmap-cell")
    .attr("data-cell", d => cellKey(d.weekday, d.time_bucket))
    .attr("data-weekday", d => d.weekday)
    .attr("data-time", d => d.time_bucket)
    .attr("x", d => x(d.weekday))
    .attr("y", d => y(d.time_bucket))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("fill", d => color(d.count))
    .attr("opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      heatmapTooltip
        .style("display", "block")
        .html(`
          <strong>${weekdayDisplay[d.weekday] || d.weekday}, ${timeDisplay[d.time_bucket] || d.time_bucket}</strong><br>
          ${d.count.toLocaleString()} estimated monthly scheduled sweeping occurrences<br>
          Click to select just this cell.
        `);
    })
    .on("mousemove", function(event) {
      heatmapTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      heatmapTooltip.style("display", "none");
    })
    .on("click", function(event, d) {
      toggleSingleCell(cellKey(d.weekday, d.time_bucket));
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
    .text("Time Window");

  updateHeatmapSelection();

}).catch(error => {
  console.error("Error loading heatmap data:", error);
});

window.highlightHeatmapCells = function(heatmapCells) {
  if (!heatmapCells) {
    selectedHeatmapCells = new Set();
    updateHeatmapSelection();
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
  updateHeatmapSelection();
};
