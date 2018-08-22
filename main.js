
$(document).ready(function(){
  var svg = d3.select("#viewer")
    .append("svg")
    .attr("id", "main_svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .call(d3.zoom().on("zoom", function () {
            svg.attr("transform", d3.event.transform)
    }).scaleExtent([0.25, 10]))
    .append("g")

  svg.append("svg:image")
    .attr("xlink:href", "https://isic-archive.com/api/v1/image/558d6301bae47801cf734ad1/download?contentDisposition=inline")

})