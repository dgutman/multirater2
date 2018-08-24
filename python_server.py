import os
import cv2
import json
import urllib
import imutils
import numpy as np
import pandas as pd
#from isic_api import ISICApi
from flask import request, url_for, render_template
from flask_api import FlaskAPI, status, exceptions

app = FlaskAPI(__name__)
BASE_URL = 'https://isic-archive.com/api/v1/'
ISIC_ANNOTATION_ENDPOINT = 'annotation'
ISIC_SEGMENTATION_ENDPOINT = 'segmentation'
ISIC_STUDY_ENDPOINT = 'study'
ISIC_IMAGE_ENDPOINT = 'image'
HOST = "0.0.0.0"
PORT = 8080
DIVISOR = 10

def url_to_image(url):
	resp = urllib.request.urlopen(url) #download image
	image = np.asarray(bytearray(resp.read()), dtype="uint8") #convert to numpy array
	image = cv2.imdecode(image, cv2.IMREAD_COLOR) #convert to opencv format
	return image #return image in opencv format

def getContours(image, segmentation):
	if segmentation == True:
		retrievalMode = cv2.RETR_EXTERNAL
	else:
		retrievalMode = cv2.RETR_EXTERNAL#cv2.RETR_LIST
	gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) #convert image to grayscale
	contours = cv2.findContours(gray.copy(), retrievalMode, cv2.CHAIN_APPROX_NONE)#cv2.CHAIN_APPROX_SIMPLE) #find the contours
	contours = contours[0] if imutils.is_cv2() else contours[1] #adjust for opencv version
	return contours #return the contours as list of arrays

def retrievePixelDataAsJson(contour_data):
	pixel_data = {} #create empty dictionary
	for object_num in range(0, len(contour_data)): #loop through individual contour objects
		contour_pixel_data = "" #create empty string
		for count in range(0, contour_data[object_num].shape[0] - 1, DIVISOR): #loop through pixels
			x1 = contour_data[object_num][count][0][0] #get x coordinate
			y1 = contour_data[object_num][count][0][1] #get y coordinate
			contour_pixel_data = contour_pixel_data + str(x1) + "," + str(y1) + " " #append coordinates to string
		pixel_data[object_num] = contour_pixel_data #append contour objects to dictionary
	json_data = json.dumps(pixel_data) #convert dictionary to json
	return json_data #return data as json

#@app.route("/annotation/<annotation_id>/<feature_id>/mask")
#def retrieveAnnotationMask(annotation_id, feature_id):
#	url = BASE_URL+ISIC_ANNOTATION_ENDPOINT+'/'+annotation_id+'/'+feature_id+'/mask' #create url for ISIC annotation mask endpoint
#	image = url_to_image(url) #get image
#	contour_data = getContours(image, segmentation=False) #get contours
#	pixelJson = retrievePixelDataAsJson(contour_data) #convert to json
#	return pixelJson

def retrieveData(url):
	resp = urllib.request.urlopen(url) #retrieve data
	resp = resp.read().decode('utf-8') #parse data
	data = json.loads(resp)
	return data

@app.route("/annotationMasks/<study_id>/<image_id>/<feature>")
def retrieveAnnotationMasks(study_id, image_id, feature):
	feature2 = urllib.parse.quote(feature.replace("_", "%2F"))
	print(feature2)
	combined_pixel_data = {}
	url = BASE_URL+ISIC_ANNOTATION_ENDPOINT+'?studyId='+study_id+'&imageId='+image_id+'&state=complete' #create url for ISIC annotation mask endpoint
	annotationData = retrieveData(url)
	annotation_ids = [annotation["_id"] for annotation in annotationData]
	for annotation_id in annotation_ids:
		url = BASE_URL+ISIC_ANNOTATION_ENDPOINT+"/"+annotation_id+"/"+feature2+"/mask"
		print(url)
		image = url_to_image(url) #get image
		contour_data = getContours(image, segmentation=False) #get contours
		pixelJson = retrievePixelDataAsJson(contour_data) #convert to json
		combined_pixel_data[annotation_id] = pixelJson
		cv2.drawContours(image, contour_data, -1, (0,255,0), 3)
		cv2.imwrite(annotation_id+"_img.jpg", image)
	return combined_pixel_data

@app.route("/featuresForStudyImage/<study_id>/<image_id>")
def retrieveFeaturesForStudyImage(study_id, image_id):
	url = BASE_URL+ISIC_ANNOTATION_ENDPOINT+'?studyId='+study_id+'&imageId='+image_id+'&state=complete&detail=true' #create url for ISIC annotation mask endpoint
	annotationData = retrieveData(url)
	feature_df = pd.DataFrame(columns=['feature', 'annotation_id'])
	for annotation in annotationData:
	    feature_list = list(annotation['markups'].keys())
	    annotation_id = annotation['_id']
	    for feature in feature_list:
	        feature_df = feature_df.append({'feature': feature, 'annotation_id':annotation_id}, ignore_index=True)
	feature_df = feature_df.pivot(index='feature', columns='annotation_id', values='annotation_id')
	feat_dict = {}
	for row_num in range(0, len(feature_df.index)):
	    annotation_list = []
	    for col_num in range(0, len(feature_df.columns)):
	        if type(feature_df.iloc[row_num, col_num]) is str:
	            annotation_list.append(feature_df.iloc[row_num, col_num])
	    feat_dict[feature_df.index[row_num]] = annotation_list
	featureJson = json.dumps(feat_dict)
	return featureJson

@app.route("/segmentation/<image_id>")
def retrieveSegmentationMask(image_id):
	url = BASE_URL+ISIC_SEGMENTATION_ENDPOINT+'?imageId='+image_id #create url for ISIC segmentation endpoint
	resp = urllib.request.urlopen(url) #retrieve data
	resp = resp.read().decode('utf-8') #parse data
	segmentation_id = json.loads(resp)[0]['_id'] #retrieve segmentation id from list of segmentations
	image = url_to_image(BASE_URL+ISIC_SEGMENTATION_ENDPOINT+'/'+segmentation_id+'/'+'mask') #get image
	contour_data = getContours(image, segmentation=True) #get contours
	pixelJson = retrievePixelDataAsJson(contour_data) #convert to json
	print(pixelJson[0])
	#cv2.drawContours(image, contour_data, -1, (0,255,0), 3)
	#cv2.imwrite("seg_img.jpg", image)
	#f = open("demofile.txt", "w")
	#f.write(str(contour_data))
	#f.close()
	return pixelJson

@app.route("/studyList")
def retrieveStudyList():
	url = BASE_URL + ISIC_STUDY_ENDPOINT + '?limit=500'
	studyList = retrieveData(url)
	return studyList

@app.route("/imageList/<study_id>")
def retrieveImageList(study_id):
	url = BASE_URL + ISIC_STUDY_ENDPOINT + '/' + study_id
	imageList = retrieveData(url)
	return imageList

@app.route("/")
def main():
	return render_template('multirater.html')

if __name__ == "__main__":
	app.run(host=HOST, port=PORT)
