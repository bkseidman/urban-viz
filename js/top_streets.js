// Select the top streets SVG and read its size.
const topSvg = d3.select("#top-streets");
const topWidth = +topSvg.attr("width");
const topHeight = +topSvg.attr("height");

// Shared highlight color used when this chart links with the map.
const TOP_STREET_HIGHLIGHT_COLOR = "#8d5aa7";

// Margins leave space for the street names and axis labels.
const topMargin = { top: 40, right: 55, bottom: 45, left: 120 };
const topInnerWidth = topWidth - topMargin.left - topMargin.right;
const topInnerHeight = topHeight - topMargin.top - topMargin.bottom;

const topG = topSvg.append("g")
  .attr("transform", `translate(${topMargin.left},${topMargin.top})`);

// Tooltip shown when hovering over a street bar.
const topStreetTooltip = d3.select("body")
  .append("div")
  .attr("id", "top-streets-tooltip")
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

// Shorten long street names so the y-axis stays readable.
function shortenLabel(label, maxLength) {
  if (label.length > maxLength) {
    return label.slice(0, maxLength) + "...";
  }

  return label;
}

// Load the segment-level schedule file and group rows by full street name.
d3.csv("data/processed/cnn_schedule_details.csv").then(data => {
  data.forEach(d => {
    d.monthly_frequency = +d.monthly_frequency;
  });

  // This map stores one summary object for each corridor/street name.
  const streetMap = new Map();

  data.forEach(d => {
    const corridor = d.corridor || "Unknown street";

    if (!streetMap.has(corridor)) {
      streetMap.set(corridor, {
        corridor: corridor,
        total_frequency: 0,
        segment_count: 0,
        max_segment_frequency: 0
      });
    }

    const street = streetMap.get(corridor);

    if (!isNaN(d.monthly_frequency)) {
      street.total_frequency += d.monthly_frequency;
      street.segment_count += 1;
      street.max_segment_frequency = Math.max(street.max_segment_frequency, d.monthly_frequency);
    }
  });

  // Keep only the ten streets with the highest total estimated sweeping activity.
  const topData = Array.from(streetMap.values())
    .filter(d => d.segment_count > 0)
    .map(d => ({
      ...d,
      avg_frequency: d.segment_count > 0
        ? (d.total_frequency / d.segment_count).toFixed(1)
        : "0.0"
    }))
    .sort((a, b) => b.total_frequency - a.total_frequency)
    .slice(0, 10);

  // X encodes total sweeps, and Y lists the street names.
  const x = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.total_frequency)])
    .nice()
    .range([0, topInnerWidth]);

  const y = d3.scaleBand()
    .domain(topData.map(d => d.corridor))
    .range([0, topInnerHeight])
    .padding(0.2);

  topG.append("g")
    .call(d3.axisLeft(y).tickFormat(d => shortenLabel(d, 18)));

  topG.append("g")
    .attr("transform", `translate(0,${topInnerHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  // Draw the bars and connect hover/click interactions to the rest of the dashboard.
  topG.selectAll(".top-street-bar")
    .data(topData)
    .enter()
    .append("rect")
    .attr("class", "top-street-bar")
    .attr("data-corridor", d => d.corridor)
    .attr("x", 0)
    .attr("y", d => y(d.corridor))
    .attr("width", d => x(d.total_frequency))
    .attr("height", y.bandwidth())
    .attr("fill", "#6f99bd")
    .attr("opacity", 0.9)
    .style("cursor", "pointer")
    .on("mouseover", function(event, d) {
      topStreetTooltip
        .style("display", "block")
        .html(`
          <strong>${d.corridor}</strong><br>
          ${d.total_frequency.toLocaleString()} total estimated sweeps per month<br>
          ${d.segment_count} street segments grouped together<br>
          Average per segment: ${d.avg_frequency}x/month
        `);
    })
    .on("mousemove", function(event) {
      topStreetTooltip
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY + 12}px`);
    })
    .on("mouseout", function() {
      topStreetTooltip.style("display", "none");
    })
    .on("click", function(event, d) {
      if (window.highlightTopStreetBar) {
        window.highlightTopStreetBar(d.corridor);
      }

      if (window.highlightMapByCorridor) {
        window.highlightMapByCorridor(d.corridor, d);
      }
    });

  // Add value labels at the end of each bar.
  topG.selectAll(".top-street-value")
    .data(topData)
    .enter()
    .append("text")
    .attr("class", "top-street-label")
    .attr("x", d => x(d.total_frequency) + 5)
    .attr("y", d => y(d.corridor) + y.bandwidth() / 2 + 4)
    .text(d => d.total_frequency)
    .style("font-size", "11px")
    .style("fill", "#123b52");

  topSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", topWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Top Streets by Total Estimated Sweeps per Month");

  topSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", topWidth / 2)
    .attr("y", topHeight - 5)
    .attr("text-anchor", "middle")
    .text("Total Estimated Sweeps per Month");

}).catch(error => {
  console.error("Error loading top streets data:", error);
});

// Called by the map when a street/corridor is selected somewhere else.
window.highlightTopStreetBar = function(corridor) {
  d3.selectAll(".top-street-bar")
    .attr("opacity", function() {
      return d3.select(this).attr("data-corridor") === String(corridor) ? 1 : 0.25;
    })
    .attr("stroke", function() {
      return d3.select(this).attr("data-corridor") === String(corridor)
        ? TOP_STREET_HIGHLIGHT_COLOR
        : "none";
    })
    .attr("stroke-width", function() {
      return d3.select(this).attr("data-corridor") === String(corridor) ? 3 : 0;
    });
};

// Reset the bar chart back to its normal view.
window.resetTopStreetHighlight = function() {
  d3.selectAll(".top-street-bar")
    .attr("opacity", 0.9)
    .attr("stroke", "none")
    .attr("stroke-width", 0);
};
