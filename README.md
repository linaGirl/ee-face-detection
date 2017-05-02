# ee-face-detection

[![Greenkeeper badge](https://badges.greenkeeper.io/eventEmitter/ee-face-detection.svg)](https://greenkeeper.io/)

Detects faces in images and returns a focal point. Is used to crop the right part of an image. You should use this in conjunction with the ee-image-worker package which has support for cropping using focal points.

The face-detector runs in a separate process & is multithreaded. Its really slow because it does a set of different detections on each image :(

## installation

You have first to install native dependecies

### ubuntu linux 

    sudo apt-get install libcv-dev libopencv-dev libhighgui-dev libjpeg-dev libpng-dev libwebp-dev libtiff-dev

### mac

    sudo brew install opencv
    sudo port install jpeg libpng tiff webp


## usage

    var FaceDetection = require('ee-face-detection');


    // create an instacne
    var detector =  new FaceDetection();


    // get focal point for an image
    detector.detect(imageBuffer, function(err, focalPoint) {
        if (err) log('#Fail :(');
        else if (focalPoint) log('Yeah, we got it! x %s, y %s :)', focalPoint.x, focalPoint.y);
        else log('sorry, failed to detect any faces in this image ...'');
    });