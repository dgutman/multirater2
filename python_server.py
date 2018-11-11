#!/usr/bin/python
# -*- coding: utf-8 -*-
import os
import cv2
import json
import urllib
import imutils
import numpy as np
import pandas as pd
from flask import request, url_for, render_template
from flask_api import FlaskAPI, status, exceptions

app = FlaskAPI(__name__)
BASE_URL = 'https://isic-archive.com/api/v1/'
ISIC_ANNOTATION_ENDPOINT = 'annotation'
ISIC_SEGMENTATION_ENDPOINT = 'segmentation'
ISIC_STUDY_ENDPOINT = 'study'
ISIC_IMAGE_ENDPOINT = 'image'
HOST_ADDRESS = 'http://localhost:8080'  # include http://
PORT = 8080
HOST = HOST_ADDRESS + ':' + str(PORT)
DIVISOR = 10

def url_to_image(url):
    resp = urllib.request.urlopen(url)  # download image
    image = np.asarray(bytearray(resp.read()), dtype='uint8')  # convert to numpy array
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)  # convert to opencv format
    return image  # return image in opencv format

def getContours(image, segmentation):
    if segmentation == True:
        retrievalMode = cv2.RETR_EXTERNAL
    else:
        retrievalMode = cv2.RETR_EXTERNAL  # cv2.RETR_LIST
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)  # convert image to grayscale
    contours = cv2.findContours(gray.copy(), retrievalMode, cv2.CHAIN_APPROX_NONE)  # cv2.CHAIN_APPROX_SIMPLE) #find the contours
    contours = (contours[0] if imutils.is_cv2() else contours[1])  # adjust for opencv version
    return contours  # return the contours as list of arrays

def retrievePixelDataAsJson(contour_data):
    pixel_data = {}  # create empty dictionary
    for object_num in range(0, len(contour_data)):  # loop through individual contour objects
        contour_pixel_data = ''  # create empty string
        for count in range(0, contour_data[object_num].shape[0] - 1, DIVISOR):  # loop through pixels
            x1 = contour_data[object_num][count][0][0]  # get x coordinate
            y1 = contour_data[object_num][count][0][1]  # get y coordinate
            contour_pixel_data = contour_pixel_data + str(x1) + ',' + str(y1) + ' '  # append coordinates to string
        pixel_data[object_num] = contour_pixel_data  # append contour objects to dictionary
    json_data = json.dumps(pixel_data)  # convert dictionary to json
    return json_data  # return data as json

def retrieveData(url):
    #print(url)
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    data = json.loads(resp)
    return data

def getUsersForStudy(study_id):
    userIds = []
    userNames = []
    url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '?studyId=' + study_id + '&state=complete&detail=true'
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    response = json.loads(resp)
    for i in range(0, len(response)):
        userIds.append(pd.DataFrame(response)['user'][i]['_id'])
        userNames.append(pd.DataFrame(response)['user'][i]['name'])
    userDf = pd.DataFrame([userIds, userNames]).transpose()
    userDf.columns = ['userId','userName']
    users = userDf.groupby(['userId','userName']).size().reset_index()
    return users

def getStudyName(study_id):
    url = BASE_URL + ISIC_STUDY_ENDPOINT + '/' + study_id + '?format=json'
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    response = json.loads(resp)
    studyName = response['name']
    return studyName

def getImageDiagnosis(image_id):
    url = BASE_URL + ISIC_IMAGE_ENDPOINT + '/' + image_id
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    response = json.loads(resp)
    diagnosis = response['meta']['clinical']['diagnosis']
    return diagnosis
    
@app.route('/compileStudyData/<study_id>')
def compileStudyData(study_id):
    #studyName = getStudyName()
    rowCounter = 0
    dfColumnNames = ['studyId', 'studyName', 'imageId', 'imageName', 'diagnosis', 'feature']
    userTable = getUsersForStudy(study_id)
    for index, row in userTable.iterrows():
        dfColumnNames.append(row['userName'])
    for i in range(0, len(userTable)):
        dfColumnNames.append(str(i+1)+'-rater agreement')
    dataframe = pd.DataFrame(index=range(10000), columns=dfColumnNames)
    print(dataframe)
    studyName = getStudyName(study_id)
    imageList = retrieveImageList(study_id)
    for image in imageList['images']:
        imageId = image['_id']
        imageName = image['name']
        imageFeatures = json.loads(retrieveFeaturesForStudyImage(study_id, imageId))
        imageDiagnosis = getImageDiagnosis(imageId)
        for feature in imageFeatures.keys():
            dataframe['studyId'].iloc[rowCounter] = study_id
            dataframe['studyName'].iloc[rowCounter] = studyName
            dataframe['imageId'].iloc[rowCounter] = imageId
            dataframe['imageName'].iloc[rowCounter] = imageName
            dataframe['diagnosis'].iloc[rowCounter] = imageDiagnosis
            dataframe['feature'].iloc[rowCounter] = feature
            feature = feature.replace('/', '_')
            annotationData = retrieveAnnotationMasks(study_id, imageId, feature)
            #print(annotationData)
            annotationDataNames = annotationData.keys()
            annotationDataNames = [name for name in annotationDataNames if '_area' in name]
            print(dataframe.iloc[rowCounter])
            print(annotationDataNames)
            rowCounter += 1
    return imageList
    
@app.route('/multiraterAnnotationMasks/<study_id>/<image_id>/<feature>')
def retrieveMultiraterAnnotationMasks(study_id, image_id, feature): #need to return multirater matrix
    feature2 = urllib.parse.quote(feature.replace('_', '%2F'))
    combined_pixel_data = {}
    url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '?studyId=' + study_id \
        + '&imageId=' + image_id + '&state=complete'  # create url for ISIC annotation mask endpoint
    annotationData = retrieveData(url)
    annotation_ids = [annotation['_id'] for annotation in annotationData]
    numRaters = len(annotation_ids)
    counter = 0
    for annotation_id in annotation_ids:
        url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '/' + annotation_id \
            + '/' + feature2 + '/mask'
        image = url_to_image(url)  # get image
        if counter != 0:
            img_matrix = np.add(img_matrix, image, dtype=np.float)
        else:
            img_matrix = image
            (img_h, img_w) = image.shape[:2]
            combined_pixel_data['width'] = img_w
            combined_pixel_data['height'] = img_h
        counter = counter + 1
    tmp_img = img_matrix
    for count in range(2, numRaters+1):
        img_matrix = tmp_img
        img_matrix = img_matrix / 255
        img_matrix[img_matrix < count] = 0
        if np.amax(img_matrix) == 0:
        	continue
        img_matrix = np.uint8(img_matrix.astype(int))
        area = np.where(img_matrix != 0)
        area = json.dumps(area[0].size)
        if area == '0':
            continue
        contour_data = getContours(img_matrix, segmentation=False)
        pixelJson = retrievePixelDataAsJson(contour_data)
        combined_pixel_data[str(count)] = pixelJson
        combined_pixel_data[str(count)+'_area'] = area 
    return combined_pixel_data

@app.route('/annotationMasks/<study_id>/<image_id>/<feature>')
def retrieveAnnotationMasks(study_id, image_id, feature):
    print(feature)
    feature2 = urllib.parse.quote(feature.replace('_', '%2F'))
    print(feature2)
    #feature2 = urllib.parse.quote(feature2.replace(' ', '_'))
    combined_pixel_data = {}
    url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '?studyId=' + study_id \
        + '&imageId=' + image_id + '&state=complete'  # create url for ISIC annotation mask endpoint
    annotationData = retrieveData(url)
    annotation_ids = [annotation['_id'] for annotation in annotationData]
    counter = 0
    for annotation_id in annotation_ids:
        url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '/' + annotation_id \
            + '/' + feature2 + '/mask'
        image = url_to_image(url)  # get image
        contour_data = getContours(image, segmentation=False)  # get contours
        area = np.where(image != 0)
        area = json.dumps(area[0].size)
        if area == '0':
            continue
        pixelJson = retrievePixelDataAsJson(contour_data)  # convert to json
        combined_pixel_data[annotation_id] = pixelJson
        combined_pixel_data[annotation_id + '_area'] = area
        if counter != 0:
            img_matrix = np.add(img_matrix, image, dtype=np.float)
        else:
            img_matrix = image
            (img_h, img_w) = image.shape[:2]
        counter = counter + 1
    img_matrix_flat = img_matrix.flatten()
    img_matrix_flat = img_matrix_flat / 255
    #print(np.amax(img_matrix_flat))
    img_matrix_fl = {}
    img_matrix_fl['width'] = img_w
    img_matrix_fl['height'] = img_h
    for i in range(1, counter + 1):
        ind = np.where(img_matrix_flat == i)
        ind = ind[0].size
        img_matrix_fl[str(i) + ' rater'] = ind
    img_matrix_json = json.dumps(img_matrix_fl)
    combined_pixel_data['multiraterMatrix'] = img_matrix_json
    return combined_pixel_data

@app.route('/featuresForStudyImage/<study_id>/<image_id>')
def retrieveFeaturesForStudyImage(study_id, image_id):
    url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '?studyId=' + study_id \
        + '&imageId=' + image_id + '&state=complete&detail=true'  # create url for ISIC annotation mask endpoint
    annotationData = retrieveData(url)
    feature_df = pd.DataFrame(columns=['feature', 'annotation_id'])
    for annotation in annotationData:
        feature_list = list(annotation['markups'].keys())
        annotation_id = annotation['_id']
        for feature in feature_list:
            feature_df = feature_df.append({'feature': feature, 'annotation_id': annotation_id}, ignore_index=True)
    feature_df = feature_df.pivot(index='feature',
                                  columns='annotation_id',
                                  values='annotation_id')
    feat_dict = {}
    for row_num in range(0, len(feature_df.index)):
        annotation_list = []
        for col_num in range(0, len(feature_df.columns)):
            if type(feature_df.iloc[row_num, col_num]) is str:
                annotation_list.append(feature_df.iloc[row_num,col_num])
        feat_dict[feature_df.index[row_num]] = annotation_list
    featureJson = json.dumps(feat_dict)
    return featureJson

@app.route('/segmentation/<image_id>')
def retrieveSegmentationMask(image_id):
    url = BASE_URL + ISIC_SEGMENTATION_ENDPOINT + '?imageId=' + image_id  # create url for ISIC segmentation endpoint
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    segmentation_id = json.loads(resp)[0]['_id']  # retrieve segmentation id from list of segmentations
    image = url_to_image(BASE_URL + ISIC_SEGMENTATION_ENDPOINT + '/'
                         + segmentation_id + '/' + 'mask')  # get image
    contour_data = getContours(image, segmentation=True)  # get contours
    pixelJson = retrievePixelDataAsJson(contour_data)  # convert to json
    return pixelJson

@app.route('/segmentationArea/<image_id>')
def retrieveSegmentationArea(image_id):
    url = BASE_URL + ISIC_SEGMENTATION_ENDPOINT + '?imageId=' + image_id  # create url for ISIC segmentation endpoint
    resp = urllib.request.urlopen(url)  # retrieve data
    resp = resp.read().decode('utf-8')  # parse data
    segmentation_id = json.loads(resp)[0]['_id']  # retrieve segmentation id from list of segmentations
    image = url_to_image(BASE_URL + ISIC_SEGMENTATION_ENDPOINT + '/'
                         + segmentation_id + '/' + 'mask')  # get image
    area = np.where(image != 0)
    area = json.dumps(area[0].size)
    return area

@app.route('/usersFromAnnotation', methods=['POST'])
def getUsersFromAnnotation():
    req_data = request.get_json()
    usernames = []
    for i in range(0, len(req_data)):
        url = BASE_URL + ISIC_ANNOTATION_ENDPOINT + '/' + req_data[i]
        resp = urllib.request.urlopen(url)
        resp = resp.read().decode('utf-8')
        user_name = json.loads(resp)['user']['name']
        usernames.append(user_name)
    return str(usernames)

@app.route('/imageDetails/<image_id>')
def retrieveImageDetails(image_id):
    imageDetailsClean = {}
    url = BASE_URL + ISIC_IMAGE_ENDPOINT + '/' + image_id
    imageDetails = retrieveData(url)
    imageDetailsClean['dataset'] = imageDetails['dataset']
    imageDetailsClean['acquisition'] = imageDetails['meta']['acquisition']
    imageDetailsClean['clinical'] = imageDetails['meta']['clinical']
    imageDetailsClean['image'] = {}
    imageDetailsClean['image']['name'] = imageDetails['name']
    imageDetailsClean['image']['_id'] = image_id
    imageDetailsClean['dataset'].pop('updated', None)
    imageDetailsClean['dataset'].pop('_accessLevel', None)
    return imageDetailsClean

@app.route('/studyList')
def retrieveStudyList():
    print(request.headers)
    url = BASE_URL + ISIC_STUDY_ENDPOINT + '?limit=500'
    studyList = retrieveData(url)
    return studyList

@app.route('/imageList/<study_id>')
def retrieveImageList(study_id):
    print(request.headers)
    url = BASE_URL + ISIC_STUDY_ENDPOINT + '/' + study_id
    imageList = retrieveData(url)
    return imageList

@app.route('/')
def main():
    return render_template('multirater.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=PORT)
