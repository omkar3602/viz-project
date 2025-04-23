const incidents_bar_svg = d3.select("#incidents-bar-svg");
const bar_width = 500;
const bar_height = 370;

const margin = { top: 10, right: 20, bottom: 20, left: 60 };
const chart_width = bar_width - margin.left - margin.right;
const chart_height = bar_height - margin.top - margin.bottom;


// Get medium tint from the color scale (us-map.js)
const mediumTint = color(d3.max(Object.values(states_data)) * 0.7);

const data = Object.entries(states_data)
  .map(([state, value]) => ({ state, value }))
  .sort((a, b) => b.value - a.value); // Sort descending

const x = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)])
  .range([0, chart_width]);

const y = d3.scaleBand()
  .domain(data.map(d => d.state))
  .range([0, chart_height])
  .padding(0.2);

const chart = incidents_bar_svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Draw bars
chart.selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("y", d => y(d.state))
  .attr("width", d => x(d.value))
  .attr("height", y.bandwidth())
  .attr("fill", mediumTint);

// Add value labels
chart.selectAll("text.label")
  .data(data)
  .enter()
  .append("text")
  .attr("class", "label")
  .attr("x", d => x(d.value) + 5)
  .attr("y", d => y(d.state) + y.bandwidth() / 2 + 4)
  .text(d => d.value)
  .style("font-size", "12px");

// Add Y axis
chart.append("g")
  .call(d3.axisLeft(y));
