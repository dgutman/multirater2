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
var svgCoords;
var imgCoords;
var origImgWidth;
var origImgHeight;
var currentImgWidth;
var currentImgHeight;
var unscaledCoords;
var multiraterMatrix;
var timer;
var segmentationArea;
var polygonTemp;
var numRaters;
var annotatorAreaOrdered;

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
    $('#featureSelector').change(function(){
        selectedFeature = this.value.substring(0,this.value.lastIndexOf(' '));
        if (selectedFeature != "") {
            displayAnnotation(selectedFeature.replace("/", "_").replace(":", "%3A"));
        }
    });
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
    $('#featureSelector').children().remove();
    var featureListTmp = [];
    getFeatureList(selectedStudyId, selectedImageId).then(function(data){
        featureData = data;
        $.each(featureData, function(x) {
            featureListTmp.push(x + " ["+featureData[x].length+"]");
        });
        featureList = featureListTmp;
        addOptions('featureSelector', featureList, 'Select a Feature');
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
         .on("mouseover", function() {
            console.log(this);
            d3.select(this)
                .attr("style", "fill: cyan; stroke: black");

        })
         .on("mousemove", function(){
            //polygonTemp = this;
            //numRaters = 0;
            timer = setTimeout(function(){
                numRaters = 0;
                var polys = $('.polygons');
                for(var i=0; i<polys.length; i++) {
                    var arr = makeArr(polys[i]);
                    numRaters = numRaters + d3.polygonContains(arr, unscaledCoords);
                }
                console.log(numRaters);
               //numRaters = 0;
            }, 600);

         })
         .on("mouseout", function() {
            d3.select(this)
                .attr("style", "fill: lightgray; stroke: none");
            clearTimeout(timer);
            numRaters = 0;
        })
}

function makeArr(polygonTemp) {
    thisPoints = d3.select(polygonTemp).attr('points');
    x = thisPoints.split(" ");
    arr = [];
    for (i=0; i<x.length; i++) {
        arr_tmp = [];
        splitt = x[i].split(",");
        arr_tmp.push(parseInt(splitt[0]));
        arr_tmp.push(parseInt(splitt[1]));
        arr.push(arr_tmp);
    }
    return arr;
}

function trimFirstLast(string){
    var string = string.substring(1)
    string = string.substring(0, string.length - 2);
    return string
}

function displayAnnotation(selectedFeature){
    //var polygonPoints;
    $('#inner-g').children().remove();
    console.log(selectedFeature);
    d3.select('#loadingDiv').attr("style", "display:block");
    getAnnotationData(selectedStudyId, selectedImageId, selectedFeature).then(function(data){
        combinedAnnotationData = data;
        multiraterMatrix = JSON.parse(data['multiraterMatrix']);
        delete combinedAnnotationData['multiraterMatrix'];
        console.log(combinedAnnotationData);
        origImgWidth = multiraterMatrix['width'];
        origImgHeight = multiraterMatrix['height'];
        var colors = ['lightgray', 'lightgray', 'lightgray', 'lightgray', 'lightgray'];
        //var keyNames = Object.keys(combinedAnnotationData);
        annotatorAreaOrdered = sortJsObject(combinedAnnotationData);
        var keyNames = annotatorAreaOrdered[1];
        keyNames = keyNames.reverse();
        for (var i=0; i<keyNames.length; i++) {
            if (keyNames[i].indexOf("area") != -1) {continue;}
            var polygonPointString = combinedAnnotationData[keyNames[i]];
            polygonPointJson = JSON.parse(polygonPointString);
            for (var j=0; j<Object.keys(polygonPointJson).length; j++) {
                polygonPoints = polygonPointJson[Object.keys(polygonPointJson)[j]];
                if (polygonPoints.length > 10) {
                    plotPointsOnImage(polygonPoints, colors[i%5]);
                }
            }
        }
        getUsers();
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
    getSegmentationArea(imageId).then(function(data){
        segmentationArea = data;
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

function getSegmentationArea(imageId) {
    var segArea = {};
    segArea = axios({
        method: 'get',
        url: "http://localhost:8080/segmentationArea/"+imageId,
    }).then(function(response) {
        return response.data;
    });
    return segArea;
}

function getUsersFromAnnotationIds() {
    var usernames = {};
    usernames = axios({
        method: 'post',
        url: "http://localhost:8080/usersFromAnnotation",
        data: annotatorAreaOrdered[1]
    }).then(function(response) {
        return response.data;
    });
    return usernames;
}

function getUsers() {
    getUsersFromAnnotationIds().then(function(data){
        //console.log(data);
        //console.log(JSON.parse(data));
        data = data.split(",");
        for (var i=0; i<data.length; i++) {
            data[i] = data[i].replace(/[^0-9a-z ]/gi, '');
        }
        console.log(data);
        annotatorAreaOrdered[annotatorAreaOrdered.length] = data;
    })
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
    d3.select('#main_svg').on("mousemove", function() {
        //setTimeout(getCoords(), 500);
        svgCoords = getCoords(this);
        unscaledCoords = getUnscaledCoords(svgCoords);
        //console.log(unscaledCoords);
    });
    d3.select('#svgImage').on("mousemove", function() {
        //setTimeout(getCoords(), 500);
        imgCoords = getCoords(this);
        //console.log(unscaledCoords);
    });
    plotSegmentation(imageId);

}

function getCoords(place) {
      var coords = d3.mouse(place);
      //currentImgWidth = document.getElementById('outer-g').getBoundingClientRect().width;
      currentImgHeight = document.getElementById('outer-g').getBoundingClientRect().height;
      //console.log(coords);
      return coords;
}

function getUnscaledCoords(svgCoords) {
    var t = d3.select('#outer-g').attr("transform");

    if (t != null) {
        var tr = t.substring(t.indexOf("(")+1, t.indexOf(")")).split(",");
        var x_translation = parseInt(tr[0]);
        var y_translation = parseInt(tr[1]);
    } else {
        var x_translation = 0;
        var y_translation = 0;
    }

    var scaled_x_location = svgCoords[0] - x_translation + 1;
    var scaled_y_location = svgCoords[1] - y_translation + 1;

    var unscaled_x_location = (origImgHeight/currentImgHeight)*scaled_x_location;
    var unscaled_y_location = (origImgHeight/currentImgHeight)*scaled_y_location;

    return [unscaled_x_location, unscaled_y_location];
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

 function sortJsObject(dict) {
    var keys = [];
    for(var key in dict) { 
       if (key.indexOf("area") == -1) {
          continue;
       }
       keys[keys.length] = key;
     }
     var values = [];     
     for(var i = 0; i < keys.length; i++) {
         values[values.length] = dict[keys [i]];
     }
     var sortedValues = values.sort(sortNumber);
     var keyNames = [];
     for(var i=0; i<sortedValues.length;i++){ 
        keyNames[i] = getKeyByValue(dict, sortedValues[i]);
        keyNames[i] = keyNames[i].replace("_area", "");
     }
     return [sortedValues, keyNames];
}

// this is needed to sort values as integers
function sortNumber(a,b) {
   return a - b;
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}


