
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
  $('select').prettyDropdown();
})

function addOptions(elementId, selectValues){
    $.each(selectValues, function(key, value) {   
     $('#'+elementId)
         .append($("<option></option>")
                    .attr("value", value)
                    .text(value)); 
    });
}

function authenticate(user, ps) {
    //console.log(user, ps);
    //define username, password, and send GET request
    axios({
        method: 'get',
        url: "https://isic-archive.com/api/v1/user/authentication",
        auth: {
            username: user,
            password: ps
        }
    }).then(function(response) {
        //receive and store token
        gtoken = response.data.authToken.token;
        config = {
            method: 'get',
            headers: {
                'Girder-Token': gtoken
            },
            responseType: 'arraybuffer'
        };
        //try to set all headers for axios:
        axios.defaults.headers.common['Girder-Token'] = gtoken;
    });
}

function getStudyList(callback) {
    let url = 'https://isic-archive.com/api/v1/study?limit=500&sort=lowerName&sortdir=1&detail=false';
    axios({
        method: 'get',
        url: url,
        headers: {
            'Girder-Token': gtoken
        }
    }).then((response) => {
        resp = response;

        studyList = response.data;
        
        if(callback) callback();
    }).catch(error => {
        console.log(error);
    });
}