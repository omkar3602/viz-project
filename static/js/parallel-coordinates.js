// Select the SVG element
const parallel_coordinates_svg = d3.select("#parallel-coordinates-svg");
const pc_width = 800;
const pc_height = 400;

// Set margins
const pc_margin = { top: 30, right: 40, bottom: 40, left: 40 };
const pc_innerWidth = pc_width - pc_margin.left - pc_margin.right;
const pc_innerHeight = pc_height - pc_margin.top - pc_margin.bottom;

// Create the main group element for the visualization
const pc_chart = parallel_coordinates_svg.append("g")
    .attr("transform", `translate(${pc_margin.left},${pc_margin.top})`);

// Function to check if a value is numeric
function isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
}

// Function to determine if a column is categorical or numeric
function getColumnType(data, columnName) {
    // Count numeric values
    let numericCount = 0;
    let totalCount = 0;
    
    // Sample up to 100 values for performance
    const sampleSize = Math.min(100, data.length);
    
    for (let i = 0; i < sampleSize; i++) {
        const value = data[i][columnName];
        if (value !== null && value !== undefined && value !== "") {
            totalCount++;
            if (isNumeric(value)) numericCount++;
        }
    }
    
    // If more than 70% of values are numeric, consider it numeric
    return numericCount / totalCount > 0.7 ? "numeric" : "categorical";
}

// Process the df data for parallel coordinates
function processData(data) {
    if (!data || !data.length) return [];
    
    return data.filter(d => {
        // Ensure the record has enough non-empty values
        let validCount = 0;
        for (const key in d) {
            if (d[key] !== null && d[key] !== undefined && d[key] !== "") {
                validCount++;
            }
        }
        return validCount >= 3;
    });
}

// Create tooltip
const pc_tooltip = d3.select("body").append("div")
    .attr("class", "pc-tooltip")
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

// Check if df exists and has data
if (typeof df !== 'undefined' && df && df.length > 0) {
    // Process data
    const processedData = processData(df);
    
    // Define dimensions to include in parallel coordinates
    const dimensionNames = ["state", "city", "disposition", "victim_age", "victim_sex", "victim_race"];
    
    // Create dimension objects with name, type, and label
    let dimensions = dimensionNames.map(name => {
        const type = getColumnType(processedData, name);
        return {
            name: name,
            type: type,
            label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
    }).filter(d => d && processedData.some(item => item[d.name] !== undefined));

    
    // Create scales for each dimension based on their type
    dimensions.forEach(dimension => {
        if (dimension.type === "numeric") {
            // Numeric scale
            dimension.scale = d3.scaleLinear()
                .domain(d3.extent(processedData, d => +d[dimension.name]))
                .range([pc_innerHeight, 0]);
        } else {
            // Categorical scale
            // Get unique categories
            const categories = Array.from(new Set(
                processedData
                    .map(d => d[dimension.name])
                    .filter(d => d !== null && d !== undefined && d !== "")
            )).sort();
            
            dimension.scale = d3.scalePoint()
                .domain(categories)
                .range([pc_innerHeight, 0])
                .padding(0.5);
        }
    });
    
    // Create x scale for positioning dimensions
    const x = d3.scalePoint()
        .range([0, pc_innerWidth])
        .padding(1)
        .domain(dimensions.map(d => d.name));
    
    // Color scale for lines based on 'incidents' column if available
    let colorScale;
    if (processedData.some(d => isNumeric(d.incidents))) {
        colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([0, d3.max(processedData, d => +d.incidents || 0)]);
    } else {
        // Use a medium red tint when incidents not available
        colorScale = d => "#e34a33"; // Medium red tint
    }
    
    // Path function that draws a line for each data point
    function path_pcp(d) {
        return d3.line()(dimensions.map(p => {
            let value = d[p.name];
            // Handle missing values
            if (value === null || value === undefined || value === "") return null;
            
            // Scale based on dimension type
            if (p.type === "numeric") {
                return [x(p.name), p.scale(+value)];
            } else {
                return [x(p.name), p.scale(value)];
            }
        }).filter(p => p !== null)); // Filter out null points
    }
    
    // Create a group for all lines
    const pathGroup = pc_chart.append("g")
        .attr("class", "paths");
    
    // Draw the lines
    const lines = pathGroup.selectAll("path")
        .data(processedData)
        .enter()
        .append("path")
        .attr("class", "pc-line")
        .attr("d", path_pcp)
        .style("fill", "none")
        .style("stroke", d => colorScale(+d.incidents || 0))
        .style("stroke-width", 1.5)
        .style("opacity", 0.7)
        .on("mouseover", function(event, d) {
            // Highlight this line
            d3.select(this)
                .style("stroke-width", 3)
                .style("opacity", 1);
            
            // Show tooltip with formatted values
            let tooltipContent = `<strong>${d.state || ""}${d.city ? ` - ${d.city}` : ""}</strong><br>`;
            
            dimensions.forEach(dim => {
                let value = d[dim.name];
                let formattedValue = "N/A";
                
                if (value !== null && value !== undefined && value !== "") {
                    if (dim.type === "numeric") {
                        if (dim.name.includes("income")) {
                            formattedValue = `$${(+value).toLocaleString()}`;
                        } else if (dim.name.includes("rate")) {
                            formattedValue = `${(+value).toFixed(1)}%`;
                        } else {
                            formattedValue = (+value).toLocaleString();
                        }
                    } else {
                        formattedValue = value;
                    }
                }
                
                tooltipContent += `${dim.label}: ${formattedValue}<br>`;
            });
            
            pc_tooltip.transition()
                .duration(200)
                .style("opacity", 0.9);
                
            pc_tooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            // Restore this line
            d3.select(this)
                .style("stroke-width", 1.5)
                .style("opacity", 0.7);
                
            // Hide tooltip
            pc_tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .on("click", function(event, d) {
            // Highlight selected line and dim others
            pathGroup.selectAll(".pc-line")
                .style("opacity", 0.3)
                .style("stroke-width", 1);
                
            d3.select(this)
                .style("opacity", 1)
                .style("stroke-width", 3);
                    });
    
    // Add a group element for each dimension
    const axes = pc_chart.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d.name)}, 0)`)
        .call(d3.drag()
            .subject(function(event, d) { return {x: x(d.name)}; })
            .on("start", function(event, d) {
                this.dragging = {x: x(d.name)};
                d3.select(this).raise().classed("active", true);
            })
            .on("drag", function(event, d) {
                this.dragging.x = Math.max(0, Math.min(pc_innerWidth, event.x));
                
                // Update position during drag
                d3.select(this).attr("transform", `translate(${this.dragging.x},0)`);
                
                // Reorder dimensions based on current positions
                const positions = {};
                axes.each(function(d) {
                    if (this.dragging) {
                        positions[d.name] = this.dragging.x;
                    } else {
                        positions[d.name] = x(d.name);
                    }
                });
                
                // Sort dimensions by position
                dimensions.sort((a, b) => positions[a.name] - positions[b.name]);
                
                // Update x domain
                x.domain(dimensions.map(d => d.name));
                
                // Update positions of other axes
                axes.filter(function(d) {
                    return this !== event.sourceEvent.target.parentNode;
                }).attr("transform", d => `translate(${x(d.name)},0)`);
                
                // Redraw lines
                pathGroup.selectAll("path").attr("d", path_pcp);
            })
            .on("end", function(event, d) {
                delete this.dragging;
                d3.select(this).classed("active", false);
                
                // Transition axes to final positions
                d3.select(this).transition().duration(500)
                    .attr("transform", `translate(${x(d.name)},0)`);
                
                // Transition lines to new positions
                pathGroup.selectAll("path").transition().duration(500)
                    .attr("d", path_pcp);
            })
        );
    
    // Add an axis for each dimension
    axes.append("g")
        .attr("class", "axis")
        .each(function(d) {
            // Create appropriate axis based on dimension type
            let axis;
            
            if (d.type === "numeric") {
                axis = d3.axisLeft().scale(d.scale);
                
                // Format ticks for specific types of data
                if (d.name.includes("income")) {
                    axis.tickFormat(d => `$${d/1000}k`);
                } else if (d.name.includes("rate")) {
                    axis.tickFormat(d => `${d}%`);
                }
            } else {
                // For categorical axes, show all categories if there aren't too many
                axis = d3.axisLeft().scale(d.scale);
                
                // If there are many categories, limit the number of ticks
                if (d.scale.domain().length > 10) {
                    axis.tickValues(d.scale.domain().filter((_, i) => i % 3 === 0));
                }
            }
            
            d3.select(this).call(axis);
        });
    
    // Add axis labels
    axes.append("text")
        .attr("y", -9)
        .attr("text-anchor", "middle")
        .attr("fill", "#000")
        .text(d => d.label)
        .style("font-size", "12px");
    
    // Add drag hint rectangle behind axis labels
    axes.insert("rect", "text")
        .attr("y", -15)
        .attr("x", -20)
        .attr("width", 40)
        .attr("height", 20)
        .attr("fill", "transparent")
        .attr("cursor", "move")
        .append("title")
        .text("Drag to reorder axes");
    
    // Add visual drag handle
    axes.append("path")
        .attr("d", "M-5,-2L5,-2M-5,0L5,0M-5,2L5,2")
        .attr("stroke", "#aaa")
        .attr("stroke-width", 1)
        .attr("fill", "none")
        .attr("cursor", "move");
    
    // Add a "reset" button
    parallel_coordinates_svg.append("text")
        .attr("class", "reset-button")
        .attr("x", pc_width - pc_margin.right - 10)
        .attr("y", pc_margin.top - 10)
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .style("fill", "#e34a33")
        .style("text-decoration", "underline")
        .style("cursor", "pointer")
        .text("Reset Selection")
        .on("click", function() {
            // Reset all lines
            pathGroup.selectAll(".pc-line")
                .style("opacity", 0.7)
                .style("stroke-width", 1.5);
            
            // Trigger reset event
            const resetEvent = new CustomEvent('stateSelected', {
                detail: { reset: true }
            });
            document.dispatchEvent(resetEvent);
        });
    
    // Add instructions for reordering
    pc_chart.append("text")
        .attr("x", pc_innerWidth / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .style("fill", "#666")
        .text("Tip: Drag axis labels to reorder dimensions");
    
    // Listen for state selection events from other visualizations
    document.addEventListener('stateSelected', function(event) {
        if (event.detail && event.detail.reset) {
            // Reset all lines
            pathGroup.selectAll(".pc-line")
                .style("opacity", 0.7)
                .style("stroke-width", 1.5);
            return;
        }
        
        if (event.detail && (event.detail.state || event.detail.abbr)) {
            const selectedState = event.detail.state || event.detail.abbr;
            
            // Highlight lines for the selected state
            pathGroup.selectAll(".pc-line")
                .style("opacity", d => d.state === selectedState ? 1 : 0.3)
                .style("stroke-width", d => d.state === selectedState ? 3 : 1);
        }
    });
} else {
    console.error("df data object not found or empty");
    pc_chart.append("text")
        .attr("x", pc_innerWidth / 2)
        .attr("y", pc_innerHeight / 2)
        .attr("text-anchor", "middle")
        .text("Data not available");
}