const us_map_svg = d3.select("#us-map-svg");
const width = 800;
const height = 400;

const projection = d3.geoAlbersUsa()
                        .scale(700)
                        .translate([width / 2, height / 2 - 20]);

const path = d3.geoPath().projection(projection);

// Track the currently selected state
let selectedStateAbbr = null;

// Create tooltip div
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
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

d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
  const states = topojson.feature(us, us.objects.states).features;

  us_map_svg.selectAll("path.state")
    .data(states)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", d => {
      const stateAbbr = idToState[d.id];
      const value = states_data[stateAbbr];
      return value ? color(value) : "#FFEFE9";
    })
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5)
    .on("mouseover", function(event, d) {
      // Show tooltip on mouseover
      const stateAbbr = idToState[d.id];
      const stateName = stateNames[stateAbbr] || stateAbbr;
      const incidents = states_data[stateAbbr] || 0;
      
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
        
      tooltip.html(`
        <strong>${stateName}</strong><br/>
        Incidents: ${incidents}
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
        
      // Highlight the state
      if (stateAbbr !== selectedStateAbbr) {
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
      }
    })
    .on("mousemove", function(event) {
      // Move tooltip with the mouse
      tooltip
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
      // Hide tooltip on mouseout
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
        
      // Restore original stroke if not the selected state
      const stateAbbr = idToState[d.id];
      if (stateAbbr !== selectedStateAbbr) {
        d3.select(this)
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5);
      }
    })
    .on("click", function(event, d) {
      // Get state info
      const stateAbbr = idToState[d.id];
      const stateName = stateNames[stateAbbr];
      
      // If clicking the same state again, deselect it
      if (stateAbbr === selectedStateAbbr) {
        selectedStateAbbr = null;
        
        // Reset all states to original style
        us_map_svg.selectAll("path.state")
          .attr("stroke", "#333")
          .attr("stroke-width", 0.5);
          
        // Dispatch event to show all states in the bar chart again
        const stateEvent = new CustomEvent('stateSelected', {
          detail: { state: null, abbr: null, reset: true }
        });
        document.dispatchEvent(stateEvent);
        
        return;
      }
      
      // Update selected state
      selectedStateAbbr = stateAbbr;
      
      // Dispatch event for selected state including cities data
      const stateEvent = new CustomEvent('stateSelected', {
        detail: { 
          state: stateName, 
          abbr: stateAbbr,
          citiesData: cities_data_dict[stateAbbr] || {}
        }
      });
      document.dispatchEvent(stateEvent);
      
      // Reset all states to original style first
      us_map_svg.selectAll("path.state")
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5);
        
      // Highlight only the selected state
      d3.select(this)
        .attr("stroke", "#000")
        .attr("stroke-width", 2.5);
    });
});

// Legend configuration
const legendWidth = 20;
const legendHeight = 200;
const legendMargin = { top: 20, left: width - legendWidth - 40 };

const legendSvg = us_map_svg.append("g")
  .attr("transform", `translate(${legendMargin.left}, ${legendMargin.top})`);

// Define linear gradient
const defs = us_map_svg.append("defs");

const linearGradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%")
  .attr("y1", "100%")
  .attr("x2", "0%")
  .attr("y2", "0%");

// Add color stops (from domain min to max)
linearGradient.selectAll("stop")
  .data(d3.ticks(0, 1, 10)) // 10 gradient stops
  .enter()
  .append("stop")
  .attr("offset", d => `${d * 100}%`)
  .attr("stop-color", d => color(d * d3.max(Object.values(states_data))));

// Draw the gradient rect
legendSvg.append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .style("fill", "url(#legend-gradient)")
  .attr("stroke", "#000")
  .attr("stroke-width", 0.5);

// Add labels using a scale and axis
const legendScale = d3.scaleLinear()
  .domain([0, d3.max(Object.values(states_data))])
  .range([legendHeight, 0]);

const legendAxis = d3.axisRight(legendScale)
  .ticks(5)
  .tickFormat(d3.format(".0f"));

legendSvg.append("g")
  .attr("transform", `translate(${legendWidth}, 0)`)
  .call(legendAxis);

// Add legend title
legendSvg.append("text")
  .attr("x", legendWidth / 2)
  .attr("y", -8)
  .attr("text-anchor", "middle")
  .style("font-size", "10px")
  .text("Incidents");

  // Add a method to recompute and re-render the map using df or filtered_df
function updateMapFromData(newData) {
  // Count incidents per state
  const updatedStatesData = d3.rollup(
    newData,
    v => v.length,
    d => d.state
  );

  // Replace states_data with new one
  window.states_data = Object.fromEntries(updatedStatesData);

  // Update color scale domain
  color.domain([0, d3.max(Object.values(states_data))]);

  // Update map colors
  us_map_svg.selectAll("path.state")
    .transition().duration(500)
    .attr("fill", d => {
      const stateAbbr = idToState[d.id];
      const value = states_data[stateAbbr];
      return value ? color(value) : "#FFEFE9";
    });

  // Update legend color stops
  d3.select("#legend-gradient")
    .selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .join("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => color(d * d3.max(Object.values(states_data))));

  // Update legend axis
  legendScale.domain([0, d3.max(Object.values(states_data))]);
  legendSvg.select("g")
    .call(d3.axisRight(legendScale).ticks(5).tickFormat(d3.format(".0f")));
}

// Listen for brush filter changes
window.addEventListener("dfUpdated", () => {
  if (window.df && Array.isArray(window.df)) {
    updateMapFromData(window.df);
  }
});
