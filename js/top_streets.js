const topSvg = d3.select("#top-streets");
const topWidth = +topSvg.attr("width");
const topHeight = +topSvg.attr("height");

const topMargin = { top: 40, right: 45, bottom: 45, left: 175 };
const topInnerWidth = topWidth - topMargin.left - topMargin.right;
const topInnerHeight = topHeight - topMargin.top - topMargin.bottom;

const topG = topSvg.append("g")
  .attr("transform", `translate(${topMargin.left},${topMargin.top})`);

function topStreetLabel(d) {
  const street = d.corridor || "Unknown street";
  const limits = d.limits || "";

  if (limits) {
    return `${street} — ${limits}`;
  }

  return street;
}

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

  const topData = data
    .filter(d => !isNaN(d.monthly_frequency))
    .sort((a, b) => b.monthly_frequency - a.monthly_frequency)
    .slice(0, 10);

  const x = d3.scaleLinear()
    .domain([0, d3.max(topData, d => d.monthly_frequency)])
    .nice()
    .range([0, topInnerWidth]);

  const y = d3.scaleBand()
    .domain(topData.map(d => d.cnn))
    .range([0, topInnerHeight])
    .padding(0.2);

  topG.append("g")
    .call(d3.axisLeft(y).tickFormat(cnn => {
      const d = topData.find(row => row.cnn === cnn);
      return shortenLabel(topStreetLabel(d), 26);
    }));

  topG.append("g")
    .attr("transform", `translate(0,${topInnerHeight})`)
    .call(d3.axisBottom(x).ticks(5));

  topG.selectAll(".top-street-bar")
    .data(topData)
    .enter()
    .append("rect")
    .attr("class", "top-street-bar")
    .attr("data-cnn", d => d.cnn)
    .attr("x", 0)
    .attr("y", d => y(d.cnn))
    .attr("width", d => x(d.monthly_frequency))
    .attr("height", y.bandwidth())
    .attr("fill", "steelblue")
    .attr("opacity", 0.85)
    .style("cursor", "pointer")
    .on("click", function(event, d) {
      if (window.highlightTopStreetBar) {
        window.highlightTopStreetBar(d.cnn);
      }

      if (window.highlightMapByCNN) {
        window.highlightMapByCNN(d.cnn);
      }
    });

  topG.selectAll(".top-street-value")
    .data(topData)
    .enter()
    .append("text")
    .attr("class", "top-street-label")
    .attr("x", d => x(d.monthly_frequency) + 5)
    .attr("y", d => y(d.cnn) + y.bandwidth() / 2 + 4)
    .text(d => d.monthly_frequency)
    .style("font-size", "11px");

  topSvg.append("text")
    .attr("class", "chart-title")
    .attr("x", topWidth / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .text("Top Street Segments by Estimated Sweeps per Month");

  topSvg.append("text")
    .attr("class", "axis-label")
    .attr("x", topWidth / 2)
    .attr("y", topHeight - 5)
    .attr("text-anchor", "middle")
    .text("Estimated Sweeps per Month");

}).catch(error => {
  console.error("Error loading top streets data:", error);
});

window.highlightTopStreetBar = function(cnn) {
  d3.selectAll(".top-street-bar")
    .attr("opacity", function() {
      return d3.select(this).attr("data-cnn") === String(cnn) ? 1 : 0.25;
    })
    .attr("stroke", function() {
      return d3.select(this).attr("data-cnn") === String(cnn) ? "#000" : "none";
    })
    .attr("stroke-width", function() {
      return d3.select(this).attr("data-cnn") === String(cnn) ? 3 : 0;
    });
};

window.resetTopStreetHighlight = function() {
  d3.selectAll(".top-street-bar")
    .attr("opacity", 0.85)
    .attr("stroke", "none")
    .attr("stroke-width", 0);
};
