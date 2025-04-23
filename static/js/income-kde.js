// Select the SVG element
const income_kde_svg = d3.select("#income-kde-svg");
const kde_width = 500;
const kde_height = 370;

// Set margins
const kde_margin = { top: 40, right: 30, bottom: 50, left: 60 };
const kde_innerWidth = kde_width - kde_margin.left - kde_margin.right;
const kde_innerHeight = kde_height - kde_margin.top - kde_margin.bottom;

// Create the main group element for the visualization
const kde_chart = income_kde_svg.append("g")
    .attr("transform", `translate(${kde_margin.left},${kde_margin.top})`);

// Set up scales
const xScale = d3.scaleLinear()
    .domain([0, 150000])  // Set initial domain for income in dollars
    .range([0, kde_innerWidth]);

const yScale = d3.scaleLinear()
    .domain([0, 0.00001])  // Initial domain, will be updated
    .range([kde_innerHeight, 0]);

// Add X axis
const xAxis_kde = kde_chart.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${kde_innerHeight})`)
    .call(d3.axisBottom(xScale)
        .tickFormat(d => `$${d/1000}k`));

// Add X axis label
kde_chart.append("text")
    .attr("class", "x-axis-label")
    .attr("x", kde_innerWidth / 2)
    .attr("y", kde_innerHeight + 40)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Mean Income");

// Add Y axis
const yAxis_kde = kde_chart.append("g")
    .attr("class", "y-axis")
    .call(d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d3.format(".2e")));

// Add Y axis label
kde_chart.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -kde_innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .text("Density");

// Create path_kde element for the KDE curve
const path_kde = kde_chart.append("path")
    .attr("class", "kde-curve")
    .attr("fill", "none")
    .attr("stroke", "#ff7f0e")
    .attr("stroke-width", 2);

// Create area element under the curve
const area = kde_chart.append("path")
    .attr("class", "kde-area")
    .attr("fill", "#ff7f0e")
    .attr("fill-opacity", 0.3);

// Create tooltip
const kde_tooltip = d3.select("body").append("div")
    .attr("class", "kde-tooltip")
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

// Helper function to compute kernel density estimation
function kernelDensityEstimator(kernel, X) {
    return function(V) {
        return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
    };
}

function kernelEpanechnikov(k) {
    return function(v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}

// Function to update the KDE visualization
function updateKDE(data, stateName = null) {
    // Generate KDE
    const kde = kernelDensityEstimator(kernelEpanechnikov(10000), xScale.ticks(100));
    const density = kde(data);

    // Update y scale domain based on density
    const yMax = d3.max(density, d => d[1]) * 1.2; // Add 20% padding
    yScale.domain([0, yMax]);
    yAxis_kde.transition().duration(500).call(d3.axisLeft(yScale).ticks(5).tickFormat(d3.format(".2e")));

    // Update the path_kde
    const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => xScale(d[0]))
        .y(d => yScale(d[1]));

    path_kde.datum(density)
        .transition()
        .duration(500)
        .attr("d", line);

    // Update the area under the curve
    const areaGenerator = d3.area()
        .curve(d3.curveBasis)
        .x(d => xScale(d[0]))
        .y0(kde_innerHeight)
        .y1(d => yScale(d[1]));

    area.datum(density)
        .transition()
        .duration(500)
        .attr("d", areaGenerator);

    // Update title based on selection
    const title = stateName ? `Mean Income Distribution: ${stateName}` : "Mean Income Distribution: United States";
    d3.select("#income-kde-container-header").text(title);

    // Add vertical line for mean income
    const meanIncome = d3.mean(data);
    
    // Remove previous mean line if exists
    kde_chart.selectAll(".mean-line").remove();
    
    // Add new mean line
    kde_chart.append("line")
        .attr("class", "mean-line")
        .attr("x1", xScale(meanIncome))
        .attr("y1", 0)
        .attr("x2", xScale(meanIncome))
        .attr("y2", kde_innerHeight)
        .attr("stroke", "#e41a1c")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5");
        
    // Add mean value label
    kde_chart.append("text")
        .attr("class", "mean-line")
        .attr("x", xScale(meanIncome))
        .attr("y", -5)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#e41a1c")
        .text(`Mean: $${Math.round(meanIncome).toLocaleString()}`);

    // Add interaction zone for tooltips
    kde_chart.selectAll(".interaction-rect").remove();
    
    kde_chart.append("rect")
        .attr("class", "interaction-rect")
        .attr("width", kde_innerWidth)
        .attr("height", kde_innerHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("mousemove", function(event) {
            const [xPos] = d3.pointer(event);
            const income = xScale.invert(xPos);
            
            // Find closest point in density array
            const bisect = d3.bisector(d => d[0]).left;
            const index = bisect(density, income);
            const d0 = density[index - 1];
            const d1 = density[index];
            const d = income - d0[0] > d1[0] - income ? d1 : d0;
            
            // Show tooltip
            kde_tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
                
            kde_tooltip.html(`
                <strong>Income: $${Math.round(d[0]).toLocaleString()}</strong><br>
                Density: ${d[1].toExponential(2)}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
                
            // Show vertical guide line
            kde_chart.selectAll(".guide-line").remove();
            kde_chart.append("line")
                .attr("class", "guide-line")
                .attr("x1", xScale(d[0]))
                .attr("y1", 0)
                .attr("x2", xScale(d[0]))
                .attr("y2", kde_innerHeight)
                .attr("stroke", "#333")
                .attr("stroke-width", 1)
                .attr("stroke-dasharray", "2,2");
        })
        .on("mouseout", function() {
            // Hide tooltip
            kde_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
                
            // Remove guide line
            kde_chart.selectAll(".guide-line").remove();
        });
}

// Initialize with US data
updateKDE(us_income_data);

// Listen for state selection events
document.addEventListener('stateSelected', function(event) {
    if (event.detail.reset) {
        // Reset to US data
        updateKDE(us_income_data);
        return;
    }
    
    const selectedStateAbbr = event.detail.abbr;
    const selectedStateName = event.detail.state;
    
    if (selectedStateAbbr && state_income_data[selectedStateAbbr]) {
        // Update with selected state's data
        updateKDE(state_income_data[selectedStateAbbr], selectedStateName);
    } else {
        // Fallback to US data if state data not available
        updateKDE(us_income_data);
    }
});