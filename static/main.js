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
var selectedImageIndex;
var showArrows = true;
var imageMetadata;

const BASE_URL = "http://localhost:8080"

const reducer = (accumulator, currentValue) => accumulator + currentValue;

var zoom = d3.zoom().on("zoom", function(){
    d3.select('#outer-g').attr("transform", d3.event.transform);
});


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
            var values = $('#outer-g').attr("transform").split(" ");
            var scale = values[1];
            scale = scale.replace(/[^\d.-]/g, '');
            scale = parseFloat(scale).toFixed(3);
            scale = "Scale: "+scale+"x";
            $('#scaleText')[0].innerHTML = scale;
        }).scaleExtent([0.1, 10]))
        .append("g").attr("id", "outer-g")
    d3.select("#outer-g").append("g").attr("id", "inner-g")
    //displayImage('558d6301bae47801cf734ad1');
    activateLoader();
    activateSelect('studySelector', 'Select a Study');
    activateSelect('imageSelector', 'Select an Image');
    activateSelect('featureSelector', 'Select a Feature');
    createStudyMenu();
    $('#featureSelector').change(function() {
        $('.table').remove();
        selectedFeature = this.value.substring(0, this.value.lastIndexOf(' '));
        if (selectedFeature != "") {
            displayAnnotation(selectedFeature.replace("/", "_").replace(":", "%3A"));
        }
    });
    addViewerInfo();
    activateZoomButtons();
     $('[data-toggle="tooltip"]').tooltip();
    $('#openClinicalButton').click(function() {
        $('#metadataTable').easyTable();
        $('#metadataModal').modal();
        $('#easyMenuTable').remove();
    });
    $('#metadataModal span').attr('id', 'modalClose')
    $('#modalClose').click(function(){
        $.modal.close();
    });
    
})

function activateSwitches() {
    $('input').each(function(index, element){
        $("[name='"+element.name+"']").bootstrapSwitch({size: 'sm'});
    })
    
}

function activateZoomButtons(){
    $('#zoomIn').click(function(){
        transition_delay = 500;
        var svg = d3.select('#main_svg');
        zoom.scaleBy(svg.transition().duration(transition_delay), 1.3);
        setTimeout(function(){
            var values = $('#outer-g').attr("transform").split(" ");
            scale = values[1];
            scale = scale.replace(/[^\d.-]/g, '');
            //scale = parseFloat(scale);
            //d3.select('#outer-g').attr("transform", transformText);
            scale = parseFloat(scale).toFixed(3);
            scaletxt = "Scale: "+scale+"x";
            $('#scaleText')[0].innerHTML = scaletxt;
        }, transition_delay);
    });
    $('#zoomOut').click(function(){
        transition_delay = 500;
        var svg = d3.select('#main_svg');
        zoom.scaleBy(svg.transition().duration(transition_delay), 0.7);
        setTimeout(function(){
            var values = $('#outer-g').attr("transform").split(" ");
            scale = values[1];
            scale = scale.replace(/[^\d.-]/g, '');
            //scale = parseFloat(scale);
            //d3.select('#outer-g').attr("transform", transformText);
            scale = parseFloat(scale).toFixed(3);
            scaletxt = "Scale: "+scale+"x";
            $('#scaleText')[0].innerHTML = scaletxt;
        }, transition_delay);

    });
    d3.select('#outer-g').attr("transform", "translate(0,0) scale(1)");
    activateArrowButtons();
}

function activateArrowButtons(){
    $('#rightarrow').click(function(){
        if (selectedImageIndex < imageList.length) {
            selectedImageIndex = selectedImageIndex + 1;
            selectedImageName = imageList[selectedImageIndex];
            $('#imageSelector')[0].value = selectedImageName;
            $('#imageSelector').trigger("change");
            displayImage(selectedImageId);
        }
    });
    $('#leftarrow').click(function(){
        if (selectedImageIndex > 0) {
            selectedImageIndex = selectedImageIndex - 1;
            selectedImageName = imageList[selectedImageIndex];
            $('#imageSelector')[0].value = selectedImageName;
            $('#imageSelector').trigger("change");
            displayImage(selectedImageId);
        }
    });
}

function addAnnotatorInfo() {
    $('#userTable').remove()
    content = '<table id="userTable">';
    for (var i = 0; i < annotatorAreaOrdered[2].length; i++) {
        content = content + '<tr>' + "<td class='" + annotatorAreaOrdered[2][i].replace(/ /g, '') + 
         "Checkbox'><input type='checkbox' name='box" + i + "' value='on' checked></td><td class='userColor'></td><td class='userName'>" + 
          annotatorAreaOrdered[2][i] + '</td></tr>';
    }
    content = content + '</table>';
    $('#annotatorInfo').append(content);

    for (var i = 0; i < annotatorAreaOrdered[2].length; i++) {
        $($('#annotatorInfo input')[i]).change(function() {
            userClass = $(this).parent()[0].className.replace('Checkbox', '');
            $('.'+userClass).toggle();
        })
    }
    $('#userTable').easyTable();
    $('#easyMenuTable').remove();
    activateSwitches();
}

function addColorTable() {
    $('#colorTable').remove()
    content = '<table id="colorTable">';
    for (var i = 0; i < annotatorAreaOrdered[2].length; i++) {
        if (i==0) {
            annotatorstxt = "1 Annotator";
        } else {
            annotatorstxt = (i+1)+" Annotators";
        }

        divStr = ""
        for(var j = 0; j<i+1; j++) {
            divStr = divStr + "<span class='colorBox'></span>";
        }

        content = content + '<tr>' + "<td class='userColor'>"+divStr+"</td><td class='colorInfoAnnotator'>" + annotatorstxt + '</td></tr>';
    }
    content = content + '</table>';
    $('#annotationColors').append(content);
    $('#colorTable').easyTable();
    $('#easyMenuTable').remove();
}

function addStatsTable() {
    raterNumbers = multiraterMatrix;
    delete raterNumbers['height'];
    delete raterNumbers['width'];
    raterNumbers = Object.values(raterNumbers);

    $('#statsTable').remove();

    content = '<table id="statsTable">';
    for (var i = 0; i < annotatorAreaOrdered[2].length; i++) {
        numraters = i + 1;
        ratertxt = numraters;
        rater_plus_txt = "&ge;"+numraters;
        i_rater_agreement = (raterNumbers[0]/segmentationArea)*100;
        i_rater_agreement = parseFloat(i_rater_agreement).toFixed(2)+"%";
        i_plus_rater_agreement = (Object.values(raterNumbers).reduce(reducer)/segmentationArea)*100;
        i_plus_rater_agreement = parseFloat(i_plus_rater_agreement).toFixed(2)+"%";

        content = content + '<tr>' + "<td class='raterNum'>"+ratertxt+"</td><td class='calculation'>" + i_rater_agreement + '</td>'+"<td class='raterNum'>"+rater_plus_txt+"</td><td class='calculation'>" + i_plus_rater_agreement + '</td>'+'</tr>';
        raterNumbers.shift();
    }
    content = content + '</table>';
    $('#statsInformation').append(content);
    $('#statsTable').easyTable();
    $('#easyMenuTable').remove();

}

function addViewerInfo() {
    d3.select('#main_svg')
        .append('svg')
        .attr('id', 'newg')

    d3.select('#newg').append('text')
        .text("Number of Raters at Cursor: ")
        .attr('id', 'numRatersText')
        .attr('class', 'ratersInfo')
        .attr('x', '2%')
        .attr('y', '9%')
        .attr('fill', 'black')
        .attr('display', 'none')
        .attr('font-size', '14px')

    d3.select('#newg').append('text')
        .text(" ")
        .attr('id', 'numRatersNum')
        .attr('class', 'ratersInfo')
        .attr('x', '18%')
        .attr('y', '9%')
        .attr('fill', 'black')
        .attr('display', 'none')

    d3.select('#newg').append('text')
        .text("User VDSM")
        .attr('id', 'userSelectedText')
        .attr('x', '2%')
        .attr('y', '95%')
        .attr('fill', 'black')
        .attr('font-size', '14px')
        .attr('display', 'none')

}

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
        annotationMaskData = axios({
            method: 'get',
            url: BASE_URL+"/annotationMasks/" + studyId + "/" + imageId + "/" + feature,
        }).then(function(response) {
            return response.data;

        });
    }
    return annotationMaskData;

}

function createFeatureMenu() { //need to clear feature menu
    $('#featureSelector').children().remove();
    var featureListTmp = [];
    if (selectedStudyId != "") {
        getFeatureList(selectedStudyId, selectedImageId).then(function(data) {
            featureData = data;
            $.each(featureData, function(x) {
                featureListTmp.push(x + " [" + featureData[x].length + "]");
            });
            featureList = featureListTmp;
            addOptions('featureSelector', featureList, 'Select a Feature');
        });
    }
}

function getFeatureList(studyId, imageId) {
    var featureList = {};
    featureList = axios({
        method: 'get',
        url: BASE_URL+"/featuresForStudyImage/" + studyId + '/' + imageId,
    }).then(function(response) {
        return response.data;
    });
    return featureList;
}

function plotPointsOnImage(polygonPoints, count) {
    var user = annotatorAreaOrdered[2][count].replace(/ /g, '');
    var img_g = d3.select('#inner-g');
    img_g.append('polygon')
        .attr('points', polygonPoints)
        .attr('class', 'polygons' + ' ' + user)
        .on("mouseover", function() {
            $('.ratersInfo').attr("style", "display: block;")
            $('#userSelectedText').attr("style", "display: block;")
            userclass = this.className['baseVal'].replace("polygons ", '');
            allPolys = $('.polygons');
            for(var i=0; i<allPolys.length; i++) {
                    var polygon = allPolys[i];
                    //console.log(polygon);
                    display_status = polygon.style.display;
                    if (display_status == 'none') {
                        //console.log('nonez');
                        continue;
                    } else {
                        polygon.style.fillOpacity = 0;
                    }
            }
            $('.' + userclass).attr("style", "fill: lightblue; fill-opacity:0; stroke: black");
            $('#userSelectedText')[0].innerHTML = userclass.replace("User", "Region Annotated By User ");
        })
        .on("mousemove", function() {
            timer = setTimeout(function() {
                numRaters = 0;
                var polys = $('.polygons');
                for (var i = 0; i < polys.length; i++) {
                    var arr = makeArr(polys[i]);
                    numRaters = numRaters + d3.polygonContains(arr, unscaledCoords);
                }
                $('#numRatersNum')[0].innerHTML = numRaters;
            }, 600);
        })
        .on("mouseout", function() {
            userclass = this.className['baseVal'].replace("polygons ", '');
            display_arr = [];
            allPolys = $('.polygons');
            for(var i=0; i<allPolys.length; i++) {
                    var polygon = allPolys[i];
                    //console.log(polygon);
                    display_status = polygon.style.display;
                    if (display_status == 'none') {
                        //console.log('nonez');
                        continue;
                    } else {
                        polygon.style.fillOpacity = 1;
                        polygon.style.stroke = 'none';
                        polygon.style.fill = 'lightblue';
                    }
            }
            clearTimeout(timer);
            numRaters = 0;
            $('#userSelectedText')[0].innerHTML = "";
        })
}

function makeArr(polygonTemp) {
    thisPoints = d3.select(polygonTemp).attr('points');
    x = thisPoints.split(" ");
    arr = [];
    for (i = 0; i < x.length; i++) {
        arr_tmp = [];
        splitt = x[i].split(",");
        arr_tmp.push(parseInt(splitt[0]));
        arr_tmp.push(parseInt(splitt[1]));
        arr.push(arr_tmp);
    }
    return arr;
}

function trimFirstLast(string) {
    var string = string.substring(1)
    string = string.substring(0, string.length - 2);
    return string
}

function displayAnnotation(selectedFeature) {
    //var polygonPoints;
    annotatorAreaOrdered = [];
    $('#inner-g').children().remove();
    //console.log(selectedFeature);
    d3.select('#loadingDiv').attr("style", "display:block");
    getAnnotationData(selectedStudyId, selectedImageId, selectedFeature).then(function(data) {
        annotatorAreaOrdered = [];
        combinedAnnotationData = data;
        multiraterMatrix = JSON.parse(data['multiraterMatrix']);
        delete combinedAnnotationData['multiraterMatrix'];
        //console.log(combinedAnnotationData);
        origImgWidth = multiraterMatrix['width'];
        origImgHeight = multiraterMatrix['height'];

        //var keyNames = Object.keys(combinedAnnotationData);
        annotatorAreaOrdered = sortJsObject(combinedAnnotationData);
        getUsersFromAnnotationIds().then(function() {
            var keyNames = annotatorAreaOrdered[1];
            keyNames = keyNames.reverse();
            for (var i = 0; i < keyNames.length; i++) {
                if (keyNames[i].indexOf("area") != -1) {
                    continue;
                }
                //if (annotatorAreaOrdered[0][i] != "0") {continue;}
                var polygonPointString = combinedAnnotationData[keyNames[i]];
                polygonPointJson = JSON.parse(polygonPointString);
                for (var j = 0; j < Object.keys(polygonPointJson).length; j++) {
                    polygonPoints = polygonPointJson[Object.keys(polygonPointJson)[j]];
                    if (polygonPoints.length > 10) {
                        plotPointsOnImage(polygonPoints, i);
                    }
                }
            }
            d3.select('#loadingDiv').attr("style", "display:none");
            displayClinicalTable(selectedImageId);
            addAnnotatorInfo();
            addColorTable();
            addStatsTable();

            $('#hiddenTables').attr("style", "display: flex");
        })
    })
}

function plotSegmentation(imageId) {
    var polygonPoints;
    getSegmentationData(imageId).then(function(data) {
        polygonPoints = data[0];
        var img_g = d3.select('g');
        img_g.append('polygon')
            .attr('points', polygonPoints)
            .style("fill", "none")
            .style("stroke", "green")
            .style("stroke-width", "4px");
    })
    getSegmentationArea(imageId).then(function(data) {
        segmentationArea = data;
    })
    createFeatureMenu();
}

function getSegmentationData(imageId) {
    var segData = {};
    segData = axios({
        method: 'get',
        url: BASE_URL+"/segmentation/" + imageId,
    }).then(function(response) {
        return response.data;
    });
    return segData;
}

function getSegmentationArea(imageId) {
    var segArea = {};
    segArea = axios({
        method: 'get',
        url: BASE_URL+"/segmentationArea/" + imageId,
    }).then(function(response) {
        return response.data;
    });
    return segArea;
}

function getUsersFromAnnotationIds() {
    var usernames = {};
    usernames = axios({
        method: 'post',
        url: BASE_URL+"/usersFromAnnotation",
        data: annotatorAreaOrdered[1]
    }).then(function(response) {
        data = response.data;
        data = data.split(",");
        for (var i = 0; i < data.length; i++) {
            data[i] = data[i].replace(/[^0-9a-z ]/gi, '');
        }
        //console.log(data);
        annotatorAreaOrdered[annotatorAreaOrdered.length] = data;

        return response.data;
    });
    return usernames;
}

function getUsers() {
    getUsersFromAnnotationIds().then(function(data) {
        //console.log(data);
        //console.log(JSON.parse(data));
        data = data.split(",");
        for (var i = 0; i < data.length; i++) {
            data[i] = data[i].replace(/[^0-9a-z ]/gi, '');
        }
        //console.log(data);
        annotatorAreaOrdered[annotatorAreaOrdered.length] = data;
    })
}

function getClinicalInfo(imageId) {
    var info = {};
    info = axios({
        method: 'get',
        url: BASE_URL+"/imageDetails/" + imageId,
    }).then(function(response) {
        return response.data;
    });
    return info;
}

function getImageMetadata(imageId){
    getClinicalInfo(imageId).then(function(data){
        imageMetadata = data;
        table_html = fullMetadataTable(data);
        $('#metadataModal').prepend(table_html);
        //
    });
}

function fullMetadataTable(data){
    json = data;
    var num_headers = Object.keys(json).length;
    var the_headers = Object.keys(json);
    var table_str = "<table id='metadataTable'><tr>";
    for (var i=0; i<num_headers; i++) {
      table_str += "<tr>";
      table_str += "<th colspan='2'>";
      table_str += the_headers[i];
      table_str += "</th></tr>";
      this_section = json[the_headers[i]];
      section_vars = Object.keys(this_section);
      section_vals = Object.values(this_section);
      section_length = Object.keys(this_section).length;
      for (var j=0; j<section_length; j++) {
        table_str += "<tr>";
        table_str += "<td>";
        table_str += section_vars[j];
        table_str += "</td><td>";
        table_str += section_vals[j];
        table_str += "</td>";
        table_str += "</tr>";
      }
      table_str = table_str + "</tr>";
    }
    table_str += "</table>";
    return table_str;
}

function displayClinicalTable(imageId){
    getClinicalInfo(imageId).then(function(data){
        $('#clinicalTable').remove();
            //imageMetadata = data;
        all_clinical_data = data['clinical'];

        
        var reduced_data_for_display = {};
        reduced_data_for_display['diagnosis'] = all_clinical_data['diagnosis'];
        reduced_data_for_display['benign_malignant'] = all_clinical_data['benign_malignant'];
        console.log(reduced_data_for_display);
        num_entries = $('#userTable').children().children().length;
        //delete all_clinical_data['diagnosis'];
        //delete all_clinical_data['benign_malignant'];
        
        console.log(all_clinical_data);
        for (var i = 0; i < num_entries; i++) {
            if (Object.values(all_clinical_data)[i] == null) {continue;}
            if (Object.keys(all_clinical_data)[i] == 'diagnosis' | Object.keys(all_clinical_data)[i] == 'benign_malignant') {continue;}
            reduced_data_for_display[Object.keys(all_clinical_data)[i]] = Object.values(all_clinical_data)[i];
        }
        reduced_data_for_display['image type'] = imageMetadata['acquisition']['image_type'];
        content = '<table id="clinicalTable">';
        for (var i = 0; i < num_entries; i++) {
            if (Object.values(reduced_data_for_display)[i] == null) {continue;}
            content = content + '<tr>' + "<td class='clinicalKey'>"+ Object.keys(reduced_data_for_display)[i] +"</td><td class='userColor'></td><td class='clinicalData'>" + Object.values(reduced_data_for_display)[i] + '</td></tr>';
        }

        content = content + '</table>';
        $('#clinicalInformation').append(content);
        $('#clinicalTable').easyTable();
        $('#easyMenuTable').remove();
    });
}

function displayImage(imageId) {
    //if ($('#viewer').children().first().length > 0) {
    $('#svgImage').remove();
    $('polygon').remove();
    $('#openClinicalButton').attr("style", "display: unset");


    //}

    var svg = d3.select("#outer-g")
    svg.insert("svg:image", "#inner-g")
        .attr("xlink:href", "https://isic-archive.com/api/v1/image/" + imageId + "/download?contentDisposition=inline")
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
    d3.select('#outer-g').attr("transform", "translate(0,0) scale(1)");
    plotSegmentation(imageId);
    
    var svg = d3.select('#main_svg');
    zoom.scaleTo(svg.transition(), 0.2);
/*    if(!showArrows) {
        d3.select('#leftarrow').attr('style', 'display: none');
        d3.select('#rightarrow').attr('style', 'display: none');
    } else {
        d3.select('#leftarrow').attr('style', 'display: block');
        d3.select('#rightarrow').attr('style', 'display: block')
    }
    showArrows = true;*/
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
        var tr = t.substring(t.indexOf("(") + 1, t.indexOf(")")).split(",");
        var x_translation = parseInt(tr[0]);
        var y_translation = parseInt(tr[1]);
    } else {
        var x_translation = 0;
        var y_translation = 0;
    }

    var scaled_x_location = svgCoords[0] - x_translation + 1;
    var scaled_y_location = svgCoords[1] - y_translation + 1;

    var unscaled_x_location = (origImgHeight / currentImgHeight) * scaled_x_location;
    var unscaled_y_location = (origImgHeight / currentImgHeight) * scaled_y_location;

    return [unscaled_x_location, unscaled_y_location];
}

function createStudyMenu() {
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

function createImageMenu() {
    var imageListTmp = [];
    getImageList(selectedStudyId).then(function(data) {
        studyData = data;
        $.each(studyData['images'], function(x) {
            imageListTmp.push(studyData['images'][x].name)
        });
        imageList = imageListTmp;
        addOptions('imageSelector', imageList, 'Select an Image');
        $('#imageSelector').change(function() {
            selectedImage = this.value;
            selectedImageIndex = imageList.indexOf(selectedImage);
            $.each(studyData['images'], function(key, value) {
                if (value.name == selectedImage) {
                    selectedImageId = value['_id'];
                }
            });
            if(selectedImageIndex==0) {
                console.log('0');
                d3.select('#leftarrow').attr('style', 'display: none');
                d3.select('#rightarrow').attr('style', 'display: block');
            } 
            if(selectedImageIndex>0 & selectedImageIndex<(imageList.length-1)) {
                d3.select('#leftarrow').attr('style', 'display: block');
                d3.select('#rightarrow').attr('style', 'display: block');
            }
            if(selectedImageIndex==(imageList.length-1)) {
                d3.select('#rightarrow').attr('style', 'display: none');
                d3.select('#leftarrow').attr('style', 'display: block');
            }
            displayImage(selectedImageId);
            getImageMetadata(selectedImageId);

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

function activateSelect(elementId, placeholderText) {
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
        url: BASE_URL+"/studyList",
    }).then(function(response) {
        return response.data;
    });
    return studyList;
}

function getImageList(studyId) {
    var imageList = {};
    imageList = axios({
        method: 'get',
        url: BASE_URL+"/imageList/" + studyId,
    }).then(function(response) {
        return response.data;
    });
    return imageList;
}

function sortJsObject(dict) {
    var keys = [];
    for (var key in dict) {
        if (key.indexOf("area") == -1) {
            continue;
        }
        keys[keys.length] = key;
    }
    var values = [];
    for (var i = 0; i < keys.length; i++) {
        values[values.length] = dict[keys[i]];
    }
    var sortedValues = values.sort(sortNumber);
    var keyNames = [];
    for (var i = 0; i < sortedValues.length; i++) {
        keyNames[i] = getKeyByValue(dict, sortedValues[i]);
        keyNames[i] = keyNames[i].replace("_area", "");
    }
    return [sortedValues, keyNames];
}

// this is needed to sort values as integers
function sortNumber(a, b) {
    return a - b;
}

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}
