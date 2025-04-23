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

// Create tooltip for bar chart if it doesn't exist already
const barTooltip = d3.select("body").select(".bar-tooltip").size() > 0 ?
  d3.select("body").select(".bar-tooltip") :
  d3.select("body").append("div")
    .attr("class", "bar-tooltip")
    .style("position", "absolute")
    .style("background-color", "white")
    .style("border", "1px solid #ddd")
    .style("border-radius", "4px")
    .style("padding", "8px")
    .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("z-index", 1000);

// Draw bars
chart.selectAll("rect")
  .data(data)
  .enter()
  .append("rect")
  .attr("class", "bar")
  .attr("y", d => y(d.state))
  .attr("width", d => x(d.value))
  .attr("height", y.bandwidth())
  .attr("fill", mediumTint)
  .on("mouseover", function(event, d) {
    // Change color on hover
    d3.select(this)
      .attr("fill", d3.rgb(mediumTint).darker(0.2));
    
    // Show tooltip on mouseover
    const stateName = stateNames[d.state] || d.state;
    
    barTooltip.transition()
      .duration(200)
      .style("opacity", 0.9);
      
    barTooltip.html(`
      <strong>${stateName}</strong><br/>
      Incidents: ${d.value}
    `)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mousemove", function(event) {
    // Move tooltip with the mouse
    barTooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function() {
    // Restore original color
    d3.select(this)
      .attr("fill", mediumTint);
    
    // Hide tooltip
    barTooltip.transition()
      .duration(500)
      .style("opacity", 0);
  })
  .on("click", function(event, d) {
    // Highlight the selected bar
    chart.selectAll(".bar")
      .attr("fill", bar => bar.state === d.state ? 
        d3.rgb(mediumTint).darker(0.5) : mediumTint);
    
    // Dispatch event for selected state
    const stateName = stateNames[d.state];
    const stateEvent = new CustomEvent('stateSelected', {
      detail: { state: stateName, abbr: d.state }
    });
    document.dispatchEvent(stateEvent);
  });

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

// Add title
incidents_bar_svg.append("text")
  .attr("x", bar_width / 2)
  .attr("y", margin.top - 10)
  .attr("text-anchor", "middle")
  .style("font-size", "14px")
  .style("font-weight", "bold")
  .text("Incidents by State");

// Listen for state selection from map
document.addEventListener('stateSelected', function(event) {
  // Update bar highlighting based on selected state
  if (event.detail && event.detail.abbr) {
    chart.selectAll(".bar")
      .attr("fill", d => d.state === event.detail.abbr ? 
        d3.rgb(mediumTint).darker(0.5) : mediumTint);
  }
});
