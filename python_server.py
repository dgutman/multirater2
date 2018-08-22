import os
import cv2
import json
import urllib
import imutils
import numpy as np
import pandas as pd
from isic_api import ISICApi
from flask import request, url_for
from flask_api import FlaskAPI, status, exceptions

app = FlaskAPI(__name__)
BASE_URL = 'https://isic-archive.com/api/v1/'
ISIC_ANNOTATION_ENDPOINT = 'annotation'
ISIC_SEGMENTATION_ENDPOINT = 'segmentation'
HOST = "0.0.0.0"
PORT = 8080

def url_to_image(url):
	resp = urllib.request.urlopen(url) #download image
	image = np.asarray(bytearray(resp.read()), dtype="uint8") #convert to numpy array
	image = cv2.imdecode(image, cv2.IMREAD_COLOR) #convert to opencv format
	return image #return image in opencv format

def getContours(image):
	gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) #convert image to grayscale
	contours = cv2.findContours(gray.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE) #find the contours
	contours = contours[0] if imutils.is_cv2() else contours[1] #adjust for opencv version
	return contours #return the contours as list of arrays

def retrievePixelDataAsJson(contour_data):
	pixel_data = {} #create empty dictionary
	contour_pixel_data = "" #create empty string
	for object_num in range(0, len(contour_data)): #loop through individual contour objects
		for count in range(0, contour_data[object_num].shape[0] - 1): #loop through pixels
			x1 = contour_data[object_num][count][0][0] #get x coordinate
			y1 = contour_data[object_num][count][0][1] #get y coordinate
			contour_pixel_data = contour_pixel_data + str(x1) + "," + str(y1) + " " #append coordinates to string
		pixel_data[object_num] = contour_pixel_data #append contour objects to dictionary
	json_data = json.dumps(pixel_data) #convert dictionary to json
	return json_data #return data as json

@app.route("/annotation/<annotation_id>/<feature_id>/mask")
def retrieveAnnotationMask(annotation_id, feature_id):
	url = BASE_URL+ISIC_ANNOTATION_ENDPOINT+'/'+annotation_id+'/'+feature_id+'/mask' #create url for ISIC annotation mask endpoint
	image = url_to_image(url) #get image
	contour_data = getContours(image) #get contours
	pixelJson = retrievePixelDataAsJson(contour_data) #convert to json
	return pixelJson

@app.route("/segmentation/<image_id>")
def retrieveSegmentationMask(image_id):
	url = BASE_URL+ISIC_SEGMENTATION_ENDPOINT+'?imageId='+image_id #create url for ISIC segmentation endpoint
	resp = urllib.request.urlopen(url) #retrieve data
	resp = resp.read().decode('utf-8') #parse data
	segmentation_id = json.loads(resp)[0]['_id'] #retrieve segmentation id from list of segmentations
	image = url_to_image(BASE_URL+ISIC_SEGMENTATION_ENDPOINT+'/'+segmentation_id+'/'+'mask') #get image
	contour_data = getContours(image) #get contours
	pixelJson = retrievePixelDataAsJson(contour_data) #convert to json
	return pixelJson

@app.route("/studyList")
def retrieveStudyList():
	url = BASE_URL + ISIC_STUDY_ENDPOINT + '?limit=500'
	resp = urllib.request.urlopen(url) #retrieve data
	resp = resp.read().decode('utf-8') #parse data
	studyList = json.loads(resp)[0]
	return StudyList

@app.route("/")
def main():
	return "Welcome to Multirater 2.0"

if __name__ == "__main__":
	app.run(host=HOST, port=PORT)
