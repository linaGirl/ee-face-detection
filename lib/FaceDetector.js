!function() {

    var   Class         = require('ee-class')
        , types         = require('ee-types')
        , cp            = require('child_process')
        , path          = require('path')
        , stream        = require('stream')
        , log           = require('ee-log');




    module.exports = new Class({

        messageId: {
            get: function() {
                if (this._messageId > 1000000000) this._messageId = 0;
                return ++this._messageId;
            }
        }


        , init: function() {
            this._queue = [];
            this._messages = {};
            this._messageId = 0;

            this._sending = false;

            // doo timeouts
            setInterval(function() {
                var cutoff = Date.now()-120000;

                Object.keys(this._messages).forEach(function(key) {
                    if (this._messages[key].sent < cutoff) {
                        this._messages[key].callback(new Error('Detection timed out!'));
                        delete this._messages[key];
                    }
                }.bind(this));
            }.bind(this), 60000);

            // start cp
            this._spawn();
        }



        /*
         * detect face in images
         */
        , detect: function(image, callback) {
            this._queue.push({image: image, callback: callback, attempts: 0});

            if (!this._sending) this._send();
        }



        /*
         * send all queued messages
         */
        , _send: function() {
            var item;

            this._sending = true;

            try {
                while (this._queue.length) {
                    item  = this._queue.shift();

                    this._sendMessage({
                          action: 'detect'
                        , fileLength: item.image.length
                    }, item.image, item.attempts, item.callback);

                    this._sendFile(item.image);
                }
            } catch (e) {
                // the childproccess has crashed
                // sto psending messages, dont do anything else
            };

            this._sending = false;
        }



        /*
         * send file
         */
        , _sendFile: function(image) {
            this._child.stdio[3].write(image);
        }



        /*
         * send a message and wait for a response
         */
        , _sendMessage: function(message, image, attempts, callback) {
            var id = this.messageId;

            this._messages[id] = {
                  callback      : callback
                , messageId     : id
                , image         : image
                , attempts      : attempts
                , sent          : Date.now()
            };

            //log.highlight('sending message ...');

            this._child.send({
                  message: message
                , messageId: id
            });
        }



        /* 
         * handle incoming messages from the cp
         */
        , _handleMessage: function(message) {
            if (message.hello) {
                // child has come online
                this._send();
            }
            else {
                if (this._messages[message.messageId]) {
                    this._messages[message.messageId].callback(null, message.message);
                    delete this._messages[message.messageId];
                    this._child.itemCount++;
                }
                else log.error('IPC is inconsitent. Got response i never asked for!', message);
            }
        }



        /*
         * make sure there is always a child running
         */
        , _spawn: function() {
            var options = {stdio: [process.stdin, process.stdout, process.stderr, 'pipe', 'ipc']};

            //log.warn('spawning child process, previous completed %s items....', this._child ? this._child.itemCount: 0);

            this._child = cp.spawn('node', [path.join(__dirname, '../server.js')], options);
            this._child.itemCount = 0;


            // check if there are unhandled messages tha must be rest
            Object.keys(this._messages).forEach(function(key) {
                if (this._messages[key].attempts >= 3) {
                    this._messages[key].callback(new Error('Tried to get focal point 3 times, each time the detector failed. Canceled task!'));
                }
                else {
                    this._queue.unshift({
                          image     : this._messages[key].image
                        , callback  : this._messages[key].callback
                        , attempts  : ++this._messages[key].attempts
                    });
                }

                delete this._messages[key];
            }.bind(this));

            // restart as soon the proccess crahed
            this._child.on('exit', this._spawn.bind(this));

            // checkj if the child errored
            this._child.on('error', function(){});
            this._child.stdio[3].on('error', function(){});

            // receiving messages
            this._child.on('message', this._handleMessage.bind(this));
        }
    });
}();
