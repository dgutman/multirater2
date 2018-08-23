var studies = {};
var studyNames = [];
var selectedStudy = '';
var selectedStudyId = '';

$(document).ready(function() {
    var gtoken = '';
    var config = '';
    
    var svg = d3.select("#viewer")
        .append("svg")
        .attr("id", "main_svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().on("zoom", function() {
            svg.attr("transform", d3.event.transform)
        }).scaleExtent([0.25, 10]))
        .append("g")

    svg.append("svg:image")
        .attr("xlink:href", "https://isic-archive.com/api/v1/image/558d6301bae47801cf734ad1/download?contentDisposition=inline")

    createStudyMenu();

})

function createStudyMenu(){
    var studyNamesTmp = [];
    getStudyList().then(function(data) {
        studies = data;
        $.each(studies, function(x) {
            studyNamesTmp.push(studies[x].name)
        });
        studyNames = studyNamesTmp;
        addOptions('studySelector', studyNames, 'Select a Study');
        $('#studySelector').change(function() {
            selectedStudy = this.value;
            $.each(studies, function(key, value) {
                if (value.name == selectedStudy) {
                    selectedStudyId = value['_id'];
                }
            });
        });

    });
}

function addOptions(elementId, selectValues, placeholderText) {
    $.each(selectValues, function(key, value) {
        $('#' + elementId)
            .append($("<option></option>")
                .attr("value", value)
                .text(value));
    });
    $('#' + elementId).select2({
        placeholder: {
            id: '-1', // the value of the option
            text: placeholderText
        },
        allowClear: true
    });
    $('#' + elementId).val(null).trigger('change');
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

function getStudyList() {
    var studyList = {};
    studyList = axios({
        method: 'get',
        url: "http://localhost:8080/studyList",
    }).then(function(response) {
        return response.data;
    });
    return studyList;
}