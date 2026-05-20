// Select the heatmap SVG and read its size.
const heatSvg = d3.select("#heatmap");
const heatWidth = +heatSvg.attr("width");
const heatHeight = +heatSvg.attr("height");

// Shared highlight color used for selected cells and labels.
const HEATMAP_HIGHLIGHT_COLOR = "#8d5aa7";

// Margins leave room for axis labels and the chart title.
const heatMargin = { top: 60, right: 22, bottom: 72, left: 110 };
const heatInnerWidth = heatWidth - heatMargin.left - heatMargin.right;
const heatInnerHeight = heatHeight - heatMargin.top - heatMargin.bottom;

const heatG = heatSvg.append("g")
  .attr("transform", `translate(${heatMargin.left},${heatMargin.top})`);

// These variables track selected cells and animation state.
let selectedHeatmapCells = new Set();
let heatmapValueByCell = new Map();
let heatmapData = [];

let animationFrames = [];
let animationIndex = 0;
let animationTimer = null;
let animationIsPlaying = false;
let animationSelectionActive = false;
let timelineIsDragging = false;

// Fixed order for the heatmap rows and columns.
const weekdayOrder = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];
const timeOrder = ["12-2", "2-4", "4-6", "6-8", "8-10", "10-12", "12-14"];

// Full labels used in tooltips.
const weekdayDisplay = {
  Mon: "Monday",
  Tues: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday"
};

// Short labels used in the timeline.
const weekdayShortDisplay = {
  Mon: "Mon",
  Tues: "Tue",
  Wed: "Wed",
  Thu: "Thu",
  Fri: "Fri",
  Sat: "Sat",
  Sun: "Sun"
};

// Converts time buckets into readable labels.
const timeDisplay = {
  "12-2": "12–2 AM",
  "2-4": "2–4 AM",
  "4-6": "4–6 AM",
  "6-8": "6–8 AM",
  "8-10": "8–10 AM",
  "10-12": "10 AM–12 PM",
  "12-14": "12–2 PM"
};

// Tooltip shown when hovering over heatmap cells and axis labels.
const heatmapTooltip = d3.select("body")
  .append("div")
  .attr("id", "heatmap-tooltip")
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

// Make a consistent key for each weekday and time bucket.
function cellKey(weekday, timeBucket) {
  return `${weekday}|${timeBucket}`;
}

// Add up the values for all currently selected cells.
function selectedHeatmapValueTotal() {
  let total = 0;

  selectedHeatmapCells.forEach(cell => {
    total += heatmapValueByCell.get(cell) || 0;
  });

  return total;
}

// Send the selected heatmap cells to the map/dashboard.
function pushHeatmapSelectionToDashboard() {
  const selectedCellList = Array.from(selectedHeatmapCells).join(", ");
  const selectedTotal = selectedHeatmapValueTotal();

  if (window.setHeatmapSelection) {
    window.setHeatmapSelection(selectedCellList, selectedTotal);
  }
}

// Check whether a full row is active.
function rowIsActive(timeBucket) {
  const rowCells = heatmapData
    .filter(d => d.time_bucket === timeBucket)
    .map(d => cellKey(d.weekday, d.time_bucket));

  return rowCells.some(cell => selectedHeatmapCells.has(cell));
}

// Check whether a full column is active.
function columnIsActive(weekday) {
  const colCells = heatmapData
    .filter(d => d.weekday === weekday)
    .map(d => cellKey(d.weekday, d.time_bucket));

  return colCells.some(cell => selectedHeatmapCells.has(cell));
}

// Update cell opacity, outlines, and axis label styling.
function updateHeatmapSelection() {
  d3.selectAll(".heatmap-cell")
    .attr("opacity", function() {
      const cell = d3.select(this).attr("data-cell");

      if (selectedHeatmapCells.size === 0) {
        return 0.92;
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
    .attr("fill", d => columnIsActive(d) ? HEATMAP_HIGHLIGHT_COLOR : "#123b52")
    .style("font-weight", d => columnIsActive(d) ? "700" : "400");

  d3.selectAll(".time-axis-label")
    .attr("fill", d => rowIsActive(d) ? HEATMAP_HIGHLIGHT_COLOR : "#123b52")
    .style("font-weight", d => rowIsActive(d) ? "700" : "400");
}

// Clear animated selection before a manual click selection.
function resetAnimationButKeepManualSelection() {
  if (animationSelectionActive) {
    selectedHeatmapCells = new Set();
    animationSelectionActive = false;
    updateHeatmapSelection();
  }

  stopHeatmapAnimation(false);
  animationIndex = 0;
  updateTimelineUI(animationIndex);
}

// Toggle one heatmap cell on or off.
function toggleSingleCell(cell) {
  resetAnimationButKeepManualSelection();

  if (selectedHeatmapCells.has(cell)) {
    selectedHeatmapCells.delete(cell);
  } else {
    selectedHeatmapCells.add(cell);
  }

  animationSelectionActive = false;
  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

// Toggle all cells for one weekday.
function toggleWeekdaySelection(weekday) {
  resetAnimationButKeepManualSelection();

  const matchingCells = heatmapData
    .filter(d => d.weekday === weekday)
    .map(d => cellKey(d.weekday, d.time_bucket));

  const allSelected = matchingCells.every(cell => selectedHeatmapCells.has(cell));

  if (allSelected) {
    matchingCells.forEach(cell => selectedHeatmapCells.delete(cell));
  } else {
    matchingCells.forEach(cell => selectedHeatmapCells.add(cell));
  }

  animationSelectionActive = false;
  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

// Toggle all cells for one time row.
function toggleTimeSelection(timeBucket) {
  resetAnimationButKeepManualSelection();

  const matchingCells = heatmapData
    .filter(d => d.time_bucket === timeBucket)
    .map(d => cellKey(d.weekday, d.time_bucket));

  const allSelected = matchingCells.every(cell => selectedHeatmapCells.has(cell));

  if (allSelected) {
    matchingCells.forEach(cell => selectedHeatmapCells.delete(cell));
  } else {
    matchingCells.forEach(cell => selectedHeatmapCells.add(cell));
  }

  animationSelectionActive = false;
  updateHeatmapSelection();
  pushHeatmapSelectionToDashboard();
}

/* =========================================================
   TIMELINE ANIMATION + SLIDER
========================================================= */

// Build one animation frame for every weekday/time combination.
function buildAnimationFrames() {
  animationFrames = [];

  weekdayOrder.forEach(weekday => {
    timeOrder.forEach(timeBucket => {
      animationFrames.push({
        weekday: weekday,
        timeBucket: timeBucket,
        cell: cellKey(weekday, timeBucket),
        label: `${weekdayShortDisplay[weekday] || weekday} · ${timeDisplay[timeBucket] || timeBucket}`
      });
    });
  });
}

// Update the play button, progress bar, dot, and label.
function updateTimelineUI(frameIndex) {
  const playButton = document.querySelector("#heatmap-play");
  const progress = document.querySelector("#timeline-progress");
  const dot = document.querySelector("#timeline-dot");
  const label = document.querySelector("#timeline-label");

  if (!animationFrames.length) {
    return;
  }

  const clampedIndex = Math.max(0, Math.min(frameIndex, animationFrames.length - 1));
  const frame = animationFrames[clampedIndex];

  const percent = animationFrames.length <= 1
    ? 0
    : (clampedIndex / (animationFrames.length - 1)) * 100;

  if (playButton) {
    playButton.textContent = animationIsPlaying ? "Ⅱ" : "▶";
    playButton.classList.toggle("playing", animationIsPlaying);
  }

  if (progress) {
    progress.style.width = `${percent}%`;
  }

  if (dot) {
    dot.style.left = `${percent}%`;
  }

  if (label) {
    label.textContent = frame.label;
  }
}

// Apply one frame of the heatmap animation to the dashboard.
function applyAnimationFrame(frameIndex) {
  if (!animationFrames.length) {
    return;
  }

  const clampedIndex = Math.max(0, Math.min(frameIndex, animationFrames.length - 1));
  const frame = animationFrames[clampedIndex];

  animationIndex = clampedIndex;
  selectedHeatmapCells = new Set([frame.cell]);
  animationSelectionActive = true;

  updateHeatmapSelection();
  updateTimelineUI(clampedIndex);

  if (window.setAnimatedHeatmapSelection) {
    window.setAnimatedHeatmapSelection(frame.cell, heatmapValueByCell.get(frame.cell) || 0);
  }
}

// Move to the next animation frame.
function playNextAnimationFrame() {
  applyAnimationFrame(animationIndex);

  if (animationIndex >= animationFrames.length - 1) {
    stopHeatmapAnimation(false);
    return;
  }

  animationIndex += 1;
}

// Start cycling through the weekday/time cells.
function startHeatmapAnimation() {
  if (!animationFrames.length) {
    return;
  }

  selectedHeatmapCells = new Set();
  animationSelectionActive = true;

  animationIsPlaying = true;
  updateTimelineUI(animationIndex);

  playNextAnimationFrame();

  animationTimer = window.setInterval(() => {
    playNextAnimationFrame();
  }, 850);
}

// Pause the animation without clearing the current frame.
function pauseHeatmapAnimation() {
  if (animationTimer) {
    window.clearInterval(animationTimer);
    animationTimer = null;
  }

  animationIsPlaying = false;
  updateTimelineUI(animationIndex);
}

// Stop the animation, and optionally clear the animated selection.
function stopHeatmapAnimation(clearAnimatedSelection) {
  if (animationTimer) {
    window.clearInterval(animationTimer);
    animationTimer = null;
  }

  animationIsPlaying = false;

  if (clearAnimatedSelection && animationSelectionActive) {
    selectedHeatmapCells = new Set();
    animationSelectionActive = false;
    animationIndex = 0;
    updateHeatmapSelection();
  }

  updateTimelineUI(animationIndex);
}

// Play or pause when the button is clicked.
function toggleHeatmapAnimation() {
  if (animationIsPlaying) {
    pauseHeatmapAnimation();
    return;
  }

  if (animationIndex >= animationFrames.length - 1) {
    animationIndex = 0;
  }

  startHeatmapAnimation();
}

// Convert a mouse/pointer location on the timeline into a frame index.
function frameIndexFromTimelineEvent(event) {
  const track = document.querySelector(".timeline-track");

  if (!track || !animationFrames.length) {
    return 0;
  }

  const rect = track.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, x / rect.width));

  return Math.round(ratio * (animationFrames.length - 1));
}

// Jump the animation to the point selected on the timeline.
function scrubTimeline(event) {
  if (!animationFrames.length) {
    return;
  }

  pauseHeatmapAnimation();

  const newIndex = frameIndexFromTimelineEvent(event);
  applyAnimationFrame(newIndex);
}

// Start dragging the timeline.
function startTimelineDrag(event) {
  event.preventDefault();
  timelineIsDragging = true;
  scrubTimeline(event);
}

// Continue dragging the timeline.
function moveTimelineDrag(event) {
  if (!timelineIsDragging) {
    return;
  }

  scrubTimeline(event);
}

// Stop dragging the timeline.
function stopTimelineDrag() {
  timelineIsDragging = false;
}

// Set up pointer controls for the timeline slider.
function initTimelineSlider() {
  const track = document.querySelector(".timeline-track");
  const dot = document.querySelector("#timeline-dot");

  if (!track || !dot) {
    return;
  }

  track.style.cursor = "pointer";
  dot.style.cursor = "grab";

  track.addEventListener("pointerdown", startTimelineDrag);
  dot.addEventListener("pointerdown", startTimelineDrag);

  window.addEventListener("pointermove", moveTimelineDrag);
  window.addEventListener("pointerup", stopTimelineDrag);
  window.addEventListener("pointercancel", stopTimelineDrag);
}

// Let the map stop the animation when another view is selected.
window.stopHeatmapAnimation = stopHeatmapAnimation;

/* =========================================================
   HEATMAP SETUP
========================================================= */

// Load the processed heatmap table and draw the chart.
d3.csv("data/processed/time_heatmap.csv").then(data => {
  data.forEach(d => {
    d.count = +d.count;
    heatmapValueByCell.set(cellKey(d.weekday, d.time_bucket), d.count);
  });

  heatmapData = data;
  buildAnimationFrames();

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
    .interpolator(
      d3.interpolateRgbBasis([
        "#f7f3ea",
        "#dce9ef",
        "#a6c5d6",
        "#5e8fb2",
        "#123b52"
      ])
    );

  const xAxisG = heatG.append("g")
    .attr("transform", `translate(0,${heatInnerHeight})`)
    .call(d3.axisBottom(x));

  const yAxisG = heatG.append("g")
    .call(d3.axisLeft(y).tickFormat(d => timeDisplay[d] || d));

  // Weekday labels can be clicked to select a whole column.
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

  // Time labels can be clicked to select a whole row.
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

  // Draw the heatmap cells.
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
    .attr("opacity", 0.92)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      heatmapTooltip
        .style("display", "block")
        .html(`
          <strong>${weekdayDisplay[d.weekday] || d.weekday}, ${timeDisplay[d.time_bucket] || d.time_bucket}</strong><br>
          ${d.count.toLocaleString()} estimated monthly scheduled sweeping occurrences<br>
          Click to select or deselect this cell.
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

  // Add the count labels inside the heatmap cells.
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

  // Connect the play button and timeline controls after the data loads.
  const playButton = document.querySelector("#heatmap-play");
  if (playButton) {
    playButton.addEventListener("click", toggleHeatmapAnimation);
  }

  initTimelineSlider();

  updateHeatmapSelection();
  updateTimelineUI(0);

}).catch(error => {
  console.error("Error loading heatmap data:", error);
});

// Called by the map when a selected street has matching heatmap cells.
window.highlightHeatmapCells = function(heatmapCells) {
  stopHeatmapAnimation(true);

  if (!heatmapCells) {
    selectedHeatmapCells = new Set();
    animationSelectionActive = false;
    updateHeatmapSelection();
    return;
  }

  selectedHeatmapCells = new Set(
    heatmapCells
      .split(",")
      .map(d => d.trim())
      .filter(d => d !== "" && !d.includes("Other"))
  );

  animationSelectionActive = false;
  updateHeatmapSelection();
};

// Reset the heatmap back to its normal view.
window.resetHeatmapHighlight = function() {
  stopHeatmapAnimation(true);
  selectedHeatmapCells = new Set();
  animationSelectionActive = false;
  animationIndex = 0;
  updateHeatmapSelection();
  updateTimelineUI(animationIndex);
};
