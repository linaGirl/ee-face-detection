
	
	var   Class 		= require('ee-class')
		, log 			= require('ee-log')
		, fs 			= require('fs')
		, path 			= require('path')
		, assert 		= require('assert');



	var   FaceDetector = require('../')
		, detector;



	describe('The Facedetector', function() {
		it('should not crash when instatiated', function() {
			detector = new FaceDetector();
		});	

		it('should detect a focal point on image 1', function(done) {
			this.timeout(60000);

			fs.readFile(__dirname+'/image1.jpg', function(err, data) {
				if (err) done(err);
				else {
					detector.detect(data, function(err, focalPoint) {
						if (err) done(err);
						else if (!focalPoint) done(new Error('Failed to detect faces!'));
						else done();
					});
				}
			});
		});		

		it('should detect a focal point on image 2', function(done) {
			this.timeout(60000);

			fs.readFile(__dirname+'/image2.jpg', function(err, data) {
				if (err) done(err);
				else {
					detector.detect(data, function(err, focalPoint) {
						if (err) done(err);
						else if (!focalPoint) done(new Error('Failed to detect faces!'));
						else done();
					});
				}
			});
		});		
	});
	