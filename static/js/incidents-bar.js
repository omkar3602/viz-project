const incidents_bar_svg = d3.select("#incidents-bar-svg");
const bar_width = 500;
const bar_height = 370;

const margin = { top: 20, right: 20, bottom: 20, left: 100 };
const chart_width = bar_width - margin.left - margin.right;
const chart_height = bar_height - margin.top - margin.bottom;

// Get medium tint from the color scale (us-map.js)
const mediumTint = color(d3.max(Object.values(states_data)) * 0.7);

// Initialize with state data
let currentData = Object.entries(states_data)
  .map(([state, value]) => ({ key: state, value: value }))
  .sort((a, b) => b.value - a.value); // Sort descending

const x = d3.scaleLinear()
  .range([0, chart_width]);

const y = d3.scaleBand()
  .range([0, chart_height])
  .padding(0.2);

// Update scales based on current data
function updateScales() {
  // Limit to top 15 entries for better visualization
  const displayData = currentData.slice(0, 15);
  
  x.domain([0, d3.max(displayData, d => d.value)]);
  y.domain(displayData.map(d => d.key));
}

updateScales();

// Create chart group
const chart = incidents_bar_svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// Create axes
const yAxis = chart.append("g")
  .attr("class", "y-axis");

const xAxis = chart.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0,${chart_height})`);


var chartTitle = "Incidents by State";

// Set title
const title = d3.select("#incidents-bar-container-header")
  .text(chartTitle);

// Create tooltip for bar chart
const barTooltip = d3.select("body").append("div")
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

// Function to update the chart with new data
function updateChart(newData, isCity = false) {
  showingCities = isCity;
  
  // Update the current data
  currentData = newData;
  
  // Update scales for the new data
  updateScales();
  
  // Update the axes
  yAxis.transition().duration(500).call(d3.axisLeft(y));
  xAxis.transition().duration(500).call(d3.axisBottom(x).ticks(5));
  
  // Get data for display (top 15)
  const displayData = currentData.slice(0, 15);
  
  // Update bars
  const bars = chart.selectAll(".bar")
    .data(displayData, d => d.key);
    
  // Remove old bars
  bars.exit()
    .transition()
    .duration(500)
    .attr("width", 0)
    .remove();
    
  // Add new bars
  const newBars = bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("y", d => y(d.key))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("width", 0)
    .attr("fill", mediumTint);
    
  // Update all bars
  newBars.merge(bars)
    .transition()
    .duration(500)
    .attr("y", d => y(d.key))
    .attr("height", y.bandwidth())
    .attr("width", d => x(d.value))
    .attr("fill", mediumTint);
    
  // Add interaction to all bars
  chart.selectAll(".bar")
    .on("mouseover", function(event, d) {
      // Change color on hover
      d3.select(this)
        .attr("fill", d3.rgb(mediumTint).darker(0.2));
      
      // Show tooltip with appropriate label based on state/city view
      let tooltipLabel = d.key;
      if (!showingCities) {
        tooltipLabel = stateNames[d.key] || d.key;
      }
      
      barTooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
        
      barTooltip.html(`
        <strong>${tooltipLabel}</strong><br/>
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
      if (!showingCities) {
        // If showing states, clicking a state bar should do the same as clicking that state on the map
        const stateAbbr = d.key;
        const stateName = stateNames[stateAbbr];
        
        // Dispatch the same event as if the state was clicked on the map
        const stateEvent = new CustomEvent('stateSelected', {
          detail: { 
            state: stateName, 
            abbr: stateAbbr,
            citiesData: cities_data_dict[stateAbbr] || {}
          }
        });
        document.dispatchEvent(stateEvent);
      }
    });
    
  // Update labels
  const labels = chart.selectAll(".value-label")
    .data(displayData, d => d.key);
    
  // Remove old labels
  labels.exit().remove();
  
  // Add new labels
  const newLabels = labels.enter()
    .append("text")
    .attr("class", "value-label")
    .attr("text-anchor", "start")
    .attr("alignment-baseline", "middle")
    .style("fill", "#333")
    .style("font-size", "11px");
    
  // Update all labels
  newLabels.merge(labels)
    .transition()
    .duration(500)
    .attr("x", d => x(d.value) + 5)
    .attr("y", d => y(d.key) + y.bandwidth() / 2)
    .text(d => d.value);
    
  // Update title
  title.text(chartTitle);
}

// Function to show state-level data
function showStateData() {
  const stateData = Object.entries(states_data)
    .map(([state, value]) => ({ key: state, value: value }))
    .sort((a, b) => b.value - a.value);
    
  chartTitle = "Incidents by State";
  selectedStateAbbr = null;
  updateChart(stateData, false);
}

// Function to show city-level data for a specific state
function showCityData(stateAbbr, stateName) {
  if (cities_data_dict[stateAbbr]) {
    const cityData = Object.entries(cities_data_dict[stateAbbr])
      .map(([city, value]) => ({ key: city, value: value }))
      .sort((a, b) => b.value - a.value);
      
    chartTitle = `Cities in ${stateName}`;
    selectedStateAbbr = stateAbbr;
    updateChart(cityData, true);
  }
}

// Initialize with state data
updateChart(currentData);

// Listen for state selection from map
document.addEventListener('stateSelected', function(event) {
  if (event.detail.reset) {
    // If reset signal received, show states
    showStateData();
    return;
  }
  
  if (event.detail.abbr && event.detail.citiesData) {
    // Show cities for the selected state
    showCityData(event.detail.abbr, event.detail.state);
  }
});
