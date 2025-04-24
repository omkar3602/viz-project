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
    let numericCount = 0;
    let totalCount = 0;
    const sampleSize = Math.min(100, data.length);
    for (let i = 0; i < sampleSize; i++) {
        const value = data[i][columnName];
        if (value !== null && value !== undefined && value !== "") {
            totalCount++;
            if (isNumeric(value)) numericCount++;
        }
    }
    return numericCount / totalCount > 0.7 ? "numeric" : "categorical";
}

function processData(data) {
    if (!data || !data.length) return [];
    return data.filter(d => {
        let validCount = 0;
        for (const key in d) {
            if (d[key] !== null && d[key] !== undefined && d[key] !== "") {
                validCount++;
            }
        }
        return validCount >= 3;
    });
}

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

if (typeof df !== 'undefined' && df && df.length > 0) {
    const processedData = processData(df);
    const dimensionNames = ["state", "city", "disposition", "victim_age", "victim_sex", "victim_race"];
    let dimensions = dimensionNames.map(name => {
        const type = getColumnType(processedData, name);
        return {
            name: name,
            type: type,
            label: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
    }).filter(d => d && processedData.some(item => item[d.name] !== undefined));

    dimensions.forEach(dimension => {
        if (dimension.type === "numeric") {
            dimension.scale = d3.scaleLinear()
                .domain(d3.extent(processedData, d => +d[dimension.name]))
                .range([pc_innerHeight, 0]);
        } else {
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

    const x = d3.scalePoint()
        .range([0, pc_innerWidth])
        .padding(1)
        .domain(dimensions.map(d => d.name));

    let colorScale;
    if (processedData.some(d => isNumeric(d.incidents))) {
        colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain([0, d3.max(processedData, d => +d.incidents || 0)]);
    } else {
        colorScale = d => "#e34a33";
    }

    function path_pcp(d) {
        return d3.line()(dimensions.map(p => {
            let value = d[p.name];
            if (value === null || value === undefined || value === "") return null;
            return [x(p.name), p.type === "numeric" ? p.scale(+value) : p.scale(value)];
        }).filter(p => p !== null));
    }

    const pathGroup = pc_chart.append("g").attr("class", "paths");
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
            d3.select(this)
                .style("stroke-width", 3)
                .style("opacity", 1);

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

            pc_tooltip.transition().duration(200).style("opacity", 0.9);
            pc_tooltip.html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("stroke-width", 1.5).style("opacity", 0.7);
            pc_tooltip.transition().duration(500).style("opacity", 0);
        });

    // Add a group for each dimension and append brushes
    const axes = pc_chart.selectAll(".dimension")
        .data(dimensions)
        .enter()
        .append("g")
        .attr("class", "dimension")
        .attr("transform", d => `translate(${x(d.name)}, 0)`);

    axes.append("g")
        .attr("class", "axis")
        .each(function(d) {
            const axis = d.type === "numeric" ? d3.axisLeft(d.scale) : d3.axisLeft(d.scale);
            d3.select(this).call(axis);
        });

    axes.append("g")
        .attr("class", "brush")
        .each(function(d) {
            d3.select(this).call(
                d.brush = d3.brushY()
                    .extent([[-8, 0], [8, pc_innerHeight]])
                    .on("brush end", function(event) {
                        const actives = dimensions.filter(dim => d3.brushSelection(d3.select(`#brush-${dim.name}`).node()));
                        lines.style("display", p => {
                            return actives.every(active => {
                                const sel = d3.brushSelection(d3.select(`#brush-${active.name}`).node());
                                const val = p[active.name];
                                if (val === null || val === undefined || val === "") return false;
                                const scaled = active.type === "numeric" ? active.scale(+val) : active.scale(val);
                                return scaled >= sel[0] && scaled <= sel[1];
                            }) ? null : "none";
                        });
                    })
            );
        })
        .attr("id", d => `brush-${d.name}`);

    // Axis labels
    axes.append("text")
        .attr("y", -9)
        .attr("text-anchor", "middle")
        .attr("fill", "#000")
        .text(d => d.label)
        .style("font-size", "12px");

    // Sync with other charts if needed
    document.addEventListener('stateSelected', function(event) {
        if (event.detail && event.detail.reset) {
            pathGroup.selectAll(".pc-line")
                .style("opacity", 0.7)
                .style("stroke-width", 1.5);
        } else if (event.detail && (event.detail.state || event.detail.abbr)) {
            const selectedState = event.detail.state || event.detail.abbr;
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
