!function() {

    var   Class         = require('ee-class')
        , types         = require('ee-types')
        , log           = require('ee-log')
        , path          = require('path')
        , eeImage       = require('ee-image-worker')
        , cv            = require('opencv');



    var CompoundFocus = new Class({
 
        faces: null
        , init: function(){
            this.faces = [];
        }
     
        , addFace: function(face){
            face.radius    = this.dist(0, face.width/2, 0, face.height/2);
            face.eyes      = [];
            face.mouths    = [];
            face.nose      = [];
            this.faces.push(face);
        }
     
        , dist: function(x1, x2, y1, y2){
            return Math.sqrt(Math.abs(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));
        }
     
        , itemInFace: function(item, face){
            return item.x > face.x - face.radius && item.x < face.x + face.radius
                && item.y > face.y - face.radius && item.y < face.y + face.radius;
        }
     
        , getNearestFace: function(item, faces){
            var nearest, dist;
     
            faces = faces || this.faces;
     
            faces.forEach(function(face){
                if(this.itemInFace(item, face)){
                    var newDist = this.dist(item.x, face.x, item.y, face.y);
                    if(!dist || newDist < dist){    // we also do not track faces with distance 0
                        nearest = face;
                    }
                }
            }, this);
     
            return nearest;
        }
     
        , addItemToNearestFace: function(item, target){
            var nearest = this.getNearestFace(item);
            if(nearest) nearest[target].push(item);
        }
     
        , addEye: function(eye){
            this.addItemToNearestFace(eye, 'eyes');
        }
     
        , addNose: function(nose){
            this.addItemToNearestFace(nose, 'nose');
        }
     
        , addMouth: function(mouth){
            this.addItemToNearestFace(mouth, 'mouths');
        }
     
        , mergeFaces: function(){
            var merged = [];
            this.faces.forEach(function(face){
                var nearest = this.getNearestFace(face, merged);
                if(nearest){
                    nearest.nose = nearest.nose.concat(face.nose);
                    nearest.eyes = nearest.eyes.concat(face.eyes);
                    nearest.mouths = nearest.mouths.concat(face.mouths);
                    nearest.merged = true;
                } else {
                    merged.push(face);
                }
            }, this);
            return merged;
        }
    });

    
    module.exports = FocusDetector = new Class({
          pipeline: null

        , cascades: [
              {source: '../cascades/haarcascade_frontalface_default.xml'}
            , {source: '../cascades/haarcascade_frontalface_alt.xml'}
            , {source: '../cascades/haarcascade_frontalface_alt2.xml'}
            , {source: '../cascades/haarcascade_mcs_mouth.xml', type: 'mouth'}
            , {source: '../cascades/haarcascade_mcs_nose.xml', type: 'nose'}
            , {source: '../cascades/haarcascade_eye.xml', type: 'eye'}
        ]

        , init: function init(cascades){
            this.pipeline = this._buildPipeline(cascades || this.cascades);
        }
     
        , _buildPipeline: function(cascades){
            var pipe = new eeImage.Pipeline();
            cascades.forEach(function(cascade){
                pipe.append(function(data, next){
                    data.matrix.detectObject(path.join(__dirname, cascade.source), {}, function(err, results){
                        if(err) return next(err);
                        switch(cascade.type){
                            case 'mouth':
                                results.forEach(function(mouth){ data.focus.addMouth(mouth); });
                                break;
                            case 'nose':
                                results.forEach(function(nose){ data.focus.addNose(nose); });
                                break;
                            case 'eye':
                                results.forEach(function(eye){ data.focus.addEye(eye); });
                                break;
                            default:
                                results.forEach(function(face){ data.focus.addFace(face); });
                        }
                        next(null, data);
                    });
                });
            });
            return pipe;
        }
     
        , detectFocus: function(buffer, callback){
            cv.readImage(buffer, function(err, img){
     
                if (err) return callback(err);
     
                var data = {matrix: img, focus: new CompoundFocus() };
                this.pipeline.invoke(data, function(err, result){
     
                    if(err) return callback(err);
     
                    var remaining = result.focus.mergeFaces().filter(function(face){
                        // has eyes or is a merged face
                        return face.eyes.length || face.merged;
                    });
                    remaining.sort(function(r1, r2){
                        return this.scoreFocus(r2) - this.scoreFocus(r1);
                    }.bind(this));
                    if(remaining.length){
                        var first = remaining.shift();
                        var foc = new (eeImage.engines.AbstractEngine.Focus)(first.x + first.width/2, first.y+first.height/2);
                        return callback(null, foc);
                    }
                    return callback(null, null);
                }.bind(this));
            }.bind(this));
        }
     
        , scoreFocus: function(focus) {
            var score = 0
            if (focus.merged) {
                score += 100;
            }
            if (focus.nose.length) {
                score += 100 / focus.nose.length;
            }
            if (focus.mouths.length) {
                score += 100 / focus.mouths.length;
            }
            if (focus.eyes.length) {
                score += 100 / Math.abs(2 - focus.eyes.length + 1);
            }
            return score;
        }     
    });
}();
