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
var combinedAnnotationData = {};

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
        }).scaleExtent([0.1, 10]))
       .append("g").attr("id", "outer-g")
    d3.select("#outer-g").append("g").attr("id", "inner-g")
    displayImage('558d6301bae47801cf734ad1');
    activateLoader();
    activateSelect('studySelector', 'Select a Study');
    activateSelect('imageSelector', 'Select an Image');
    activateSelect('featureSelector', 'Select a Feature');
    createStudyMenu();
})

function activateLoader() {
    var imgViewer = d3.select('#viewer');
    imgViewer.append('div')
             .attr("id", "loadingDiv")

    var loadingDiv = d3.select('#loadingDiv');
    loadingDiv.append('img')
              .attr("id", "loadingImg")
              .attr("src", "http://gifimage.net/wp-content/uploads/2017/09/ajax-loading-gif-transparent-background-8.gif")
}

function getAnnotationData(studyId, imageId, feature) {
    if (feature != "") {
        var annotationMaskData = {};
        //feature = feature.replace("/", "%2F")
        //console.log(feature);
        annotationMaskData = axios({
            method: 'get',
            url: "http://localhost:8080/annotationMasks/"+studyId+"/"+imageId+"/"+feature,
        }).then(function(response) {
            return response.data;

        });
    }
        return annotationMaskData;

}

function createFeatureMenu() { //need to clear feature menu
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
            if (selectedFeature != "") {
                displayAnnotation(selectedFeature.replace("/", "_").replace(":", "%3A"));
            }
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

function plotPointsOnImage(polygonPoints, color){
    var img_g = d3.select('#inner-g');
    img_g.append('polygon')
         .attr('points', polygonPoints)
         .attr('class', 'polygons')
         .style("fill", color)
         .style("stroke", "black")
         .style("stroke-width", "4px");
}

function trimFirstLast(string){
    var string = string.substring(1)
    string = string.substring(0, string.length - 2);
    return string
}

function displayAnnotation(selectedFeature){
    //var polygonPoints;
    console.log(selectedFeature);
    d3.select('#loadingDiv').attr("style", "display:block");
    getAnnotationData(selectedStudyId, selectedImageId, selectedFeature).then(function(data){
        combinedAnnotationData = data;
        console.log(combinedAnnotationData);
        
        var colors = ['lightgray', 'lightgray', 'lightgray', 'lightgray', 'lightgray']
        for (var i=0; i<Object.keys(combinedAnnotationData).length; i++) {
            var polygonPointString = combinedAnnotationData[Object.keys(combinedAnnotationData)[i]];
            polygonPointJson = JSON.parse(polygonPointString)
            for (var j=0; j<Object.keys(polygonPointJson).length; j++) {
                polygonPoints = polygonPointJson[Object.keys(polygonPointJson)[j]]
                if (polygonPoints.length > 100) {
                    plotPointsOnImage(polygonPoints, colors[i]);
                }
            }
        }
        d3.select('#loadingDiv').attr("style", "display:none");
    })
}

function plotSegmentation(imageId) {
    var polygonPoints;
    getSegmentationData(imageId).then(function(data){
        polygonPoints = data[0];
        var img_g = d3.select('g');
        img_g.append('polygon')
             .attr('points', polygonPoints)
             .style("fill", "none")
             .style("stroke", "green")
             .style("stroke-width", "4px");
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
    //if ($('#viewer').children().first().length > 0) {
    $('#svgImage').remove();
    $('polygon').remove();
    //}
    var svg = d3.select("#outer-g")
    svg.insert("svg:image", "#inner-g")
        .attr("xlink:href", "https://isic-archive.com/api/v1/image/"+imageId+"/download?contentDisposition=inline")
        .attr('id', 'svgImage')
        //.attr("transform", "translate(400,100) scale(0.25)")
    d3.select('#svgImage').on("mousemove", function() {
        //setTimeout(getCoords(), 500);
        getCoords(this);
    });
    plotSegmentation(imageId);

}

function getCoords(place) {
      var coords = d3.mouse(place);
      console.log(coords);

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


