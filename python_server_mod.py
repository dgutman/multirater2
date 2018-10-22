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
HOST_ADDRESS = 'http://35.227.18.183:8080'  #'http://localhost:8080'  # include http://
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
