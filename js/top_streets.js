const topSvg = d3.select("#top-streets");
const topWidth = +topSvg.attr("width");
const topHeight = +topSvg.attr("height");

const topMargin = { top: 40, right: 55, bottom: 45, left: 120 };
const topInnerWidth = topWidth - topMargin.left - topMargin.right;
const topInnerHeight = topHeight - topMargin.top - topMargin.bottom;

const topG = topSvg.append("g")
  .attr("transform", `translate(${topMargin.left},${topMargin.top})`);

function shortenLabel(label, maxLength) {
  if (label.length > maxLength) {
    return label.slice(0, maxLength) + "...";
  }

  return label;
}

d3.csv("data/processed/cnn_schedule_details.csv").then(data => {
  data.forEach(d => {
    d.monthly_frequency = +d.monthly_frequency;
  });

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

  const topData = Array.from(streetMap.values())
    .filter(d => d.segment_count > 0)
    .sort((a, b) => b.total_frequency - a.total_frequency)
    .slice(0, 10);

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
    .attr("fill", "steelblue")
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (window.highlightTopStreetBar) {
        window.highlightTopStreetBar(d.corridor);
      }

      if (window.highlightMapByCorridor) {
        window.highlightMapByCorridor(d.corridor, d);
      }
    });

  topG.selectAll(".top-street-value")
    .data(topData)
    .enter()
    .append("text")
    .attr("class", "top-street-label")
    .attr("x", d => x(d.total_frequency) + 5)
    .attr("y", d => y(d.corridor) + y.bandwidth() / 2 + 4)
    .text(d => d.total_frequency)
    .style("font-size", "11px");

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

window.highlightTopStreetBar = function(corridor) {
  d3.selectAll(".top-street-bar")
    .attr("opacity", function() {
      return d3.select(this).attr("data-corridor") === String(corridor) ? 1 : 0.25;
    })
    .attr("stroke", function() {
      return d3.select(this).attr("data-corridor") === String(corridor) ? "#000" : "none";
    })
    .attr("stroke-width", function() {
      return d3.select(this).attr("data-corridor") === String(corridor) ? 3 : 0;
    });
};

window.resetTopStreetHighlight = function() {
  d3.selectAll(".top-street-bar")
    .attr("opacity", 0.85)
    .attr("stroke", "none")
    .attr("stroke-width", 0);
};
