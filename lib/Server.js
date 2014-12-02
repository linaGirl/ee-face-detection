!function() {
    var   log               = require('ee-log')
        , type              = require('ee-types')
        , Class             = require('ee-class')
        , EEImage           = require('ee-image-worker')
        , fs                = require('fs')
        , Detector          = require('./Detector');



    module.exports = new Class({

        init: function() {
            // dont terminate .. ever
            setInterval(function(){}, 1000000);

            // queue for incoming messages
            this._queue = [];

            // detector engine
            this.detector = new Detector();

            // set up receiving data stream
            this.incoming = fs.createReadStream(null, {fd: 3});

            // handle incoming data
            this.incoming.on('data', this._handleData.bind(this));

            // handle incoming ipc messages
            process.on('message', this._handleMessage.bind(this));

            // say hello, start with the hard work
            process.send({hello: 'cp'});
        }




        /*
         * detect faces
         */
        , _process: function(messageId, message, image) {
            // downscale the image for better detection 
            var eeImage = EEImage.createImage(image)
                , width = eeImage.stats.width;

            eeImage.scale({width:1000}).toJpeg(function(err, img) {
                if (err) {
                    process.send({
                          messageId : messageId
                        , message   : {}
                    });
                }
                else {
                    this.detector.detectFocus(img, function(err, focus) {
                        var message, factor;

                        factor = width/1000;

                        if (focus) {
                            message = {};
                            message.x = Math.round(focus.x*factor);
                            message.y = Math.round(focus.y*factor);
                        }

                        process.send({
                              messageId : messageId
                            , message   : message
                        });
                    }.bind(this));
                }
            }.bind(this));
        }




        /*
         * check if we got a compelte message
         */
        , _work: function() {
            var   image
                , message;

            //log.info('checking for incoming message. buffer length %s, message count %s ..', this._buffer ? this._buffer.length : 0, this._queue.length);

            while(this._queue.length && this._buffer && this._buffer.length >= this._queue[0].message.fileLength) {
                // we got a complete file
                //log.info('received message, handling it ...'.yellow);

                // get image data
                image = this._buffer.slice(0, this._queue[0].message.fileLength);

                // remove image from buffer
                if (image.length === this._buffer.length) delete this._buffer;
                else this._buffer = this._buffer.slice(this._queue[0].message.fileLength);

                message = this._queue.shift();

                // work on image
                this._process(message.messageId, message, image);
            }
        }




        /*
         * handle incoming messages
         */
        , _handleMessage: function(message) {

            // cache message
            this._queue.push(message);

            // check if we got a complete message set
            this._work();
        }



        /*
         * handle incoming data
         */
        , _handleData: function(chunk) {
            // append to buffer
            if (!this._buffer) this._buffer = chunk;
            else this._buffer = Buffer.concat([this._buffer, chunk]);

            // check if we got a complete message set
            this._work();
        }
    });
}();
