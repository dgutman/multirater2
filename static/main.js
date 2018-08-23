var studies = {};
var studyNames = [];
var selectedStudy = '';
var selectedStudyId = '';
var studyData = {};
var imageList = [];
var selectedImageId = '';
var selectedImageFeatures = [];
var selectedFeature = '';
var featureData = {};

$(document).ready(function() {
    var gtoken = '';
    var config = '';
    displayImage('558d6301bae47801cf734ad1');
    activateSelect('studySelector', 'Select a Study');
    activateSelect('imageSelector', 'Select an Image');
    activateSelect('featureSelector', 'Select a Feature');
    createStudyMenu();
    
})

function displayAnnotation(selectedFeature){

}

function getAnnotationData(imageId) {
    var annotationMaskData = {};
    annotationMaskData = axios({
        method: 'get',
        url: "http://localhost:8080/annotation/"+imageId,
    }).then(function(response) {
        return response.data;
    });
    return annotationMaskData;
}

function createFeatureMenu() {
    var featureListTmp = [];
    getFeatureList(selectedStudyId, selectedImageId).then(function(data){
        featureData = data;
        $.each(featureData, function(x) {
            featureListTmp.push(x + " ["+featureData[x].length+"]");
        });
        featureList = featureListTmp;
        addOptions('featureSelector', featureList, 'Select a Feature');
        $('#featureSelector').change(function(){
            selectedFeature = this.value.substring(0,this.value.lastIndexOf(' '));
            displayAnnotation(selectedFeature);
        })
    });
}

function getFeatureList(studyId, imageId) {
    var featureList = {};
    featureList = axios({
        method: 'get',
        url: "http://localhost:8080/featuresForStudyImage/"+studyId+'/'+imageId,
    }).then(function(response) {
        return response.data;
    });
    return featureList;
}

function plotSegmentation(imageId) {
    var polygonPoints;
    getSegmentationData(imageId).then(function(data){
        polygonPoints = data;
        var img_g = d3.select('g');
        img_g.append('polygon')
             .attr('points', polygonPoints)
             .style("fill", "none")
             .style("stroke", "green")
             .style("strokeWidth", "30px");
    })
    createFeatureMenu();
}

function getSegmentationData(imageId) {
    var segData = {};
    segData = axios({
        method: 'get',
        url: "http://localhost:8080/segmentation/"+imageId,
    }).then(function(response) {
        return response.data;
    });
    return segData;
}

function displayImage(imageId) {
    if ($('#viewer').children().first().length > 0) {
        $('#viewer').children().first().remove();
    }
    var svg = d3.select("#viewer")
        .append("svg")
        .attr("id", "main_svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .call(d3.zoom().on("zoom", function() {
            svg.attr("transform", d3.event.transform)
        }).scaleExtent([0.1, 10]))
        .append("g")
    svg.append("svg:image")
        .attr("xlink:href", "https://isic-archive.com/api/v1/image/"+imageId+"/download?contentDisposition=inline")
        //.attr("transform", "translate(400,100) scale(0.25)")
    plotSegmentation(imageId);

}

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
            createImageMenu();
        });
    });
}

function createImageMenu(){
    var imageListTmp = [];
    getImageList(selectedStudyId).then(function(data){
        studyData = data;
        $.each(studyData['images'], function(x) {
            imageListTmp.push(studyData['images'][x].name)
        });
        imageList = imageListTmp;
        addOptions('imageSelector', imageList, 'Select an Image');
        $('#imageSelector').change(function(){
            selectedImage = this.value;
           $.each(studyData['images'], function(key, value) {
                if (value.name == selectedImage) {
                    selectedImageId = value['_id'];
                }
            });
           displayImage(selectedImageId);
        })
    });
}

function addOptions(elementId, selectValues, placeholderText) {
    $.each(selectValues, function(key, value) {
        $('#' + elementId)
            .append($("<option></option>")
                .attr("value", value)
                .text(value));
    });
    activateSelect(elementId, placeholderText);
    $('#' + elementId).val(null).trigger('change');
}

function activateSelect(elementId, placeholderText){
    $('#' + elementId).select2({
        placeholder: {
            id: '-1', // the value of the option
            text: placeholderText
        },
        allowClear: true
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

function getImageList(studyId) {
    var imageList = {};
    imageList = axios({
        method: 'get',
        url: "http://localhost:8080/imageList/"+studyId,
    }).then(function(response) {
        return response.data;
    });
    return imageList;
}


