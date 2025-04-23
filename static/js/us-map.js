const us_map_svg = d3.select("#us-map-svg");
const width = 800;
const height = 400;


const projection = d3.geoAlbersUsa()
                        .scale(700)
                        .translate([width / 2, height / 2 - 20]);

const path = d3.geoPath().projection(projection);

// Color scale
const color = d3.scaleSequential()
  .domain([0, d3.max(Object.values(states_data))])
  .interpolator(d3.interpolateReds);

// Function to convert state numeric id to abbreviation
// You can extend this mapping as needed
const idToState = {
    "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
    "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
    "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
    "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
    "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
    "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
    "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
    "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
    "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
    "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
    "56": "WY"
  };
  
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
      return value ? color(value) : "#FFEAE2";
    })
    .attr("stroke", "#333")
    .attr("stroke-width", 0.5);

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
