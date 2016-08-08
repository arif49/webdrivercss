'use strict';

/**
 * if multiple screen width are given resize browser dimension
 */
var async = require('async'),
	takenScreenSizes = {};

module.exports = function (done) {
	var that = this;
	this.newScreenSize = {};

	async.waterfall([
        /*!
         * get current browser resolution to change back to it
         * after all shots were taken (only if a screenWidth is set)
         */
        function (cb) {
            if (!that.self.defaultScreenDimension && that.screenWidth && that.screenWidth.length) {
                that.instance.windowHandleSize()
                    .then(function (res) {
                        that.self.defaultScreenDimension = res.value;
                        cb(null);
                    });
            } else {
                cb(null);
            }
        },
        function (cb) {
            that.instance.execute(function () {
                var html = document.documentElement,
                    body = document.body;
                /**
                 * remove scroll-bars
                 * reset height in case we're changing viewports
                 */
                body.style.height = '';
                body.style.overflow = '';
                body.style.height = body.scrollHeight;
                body.style.overflow = 'hidden';
                html.style.overflow = 'hidden';
            }).then(function () {
                cb(null);
            });
        },
		function (cb) {
			/**
			 * if no screenWidth option was set just continue
			 */
			if (!that.screenWidth || that.screenWidth.length === 0) {
				return cb(null);
			}

			that.newScreenSize.width = parseInt(that.screenWidth.shift(), 10);
			that.newScreenSize.height = parseInt(that.self.defaultScreenDimension.height, 10);

			that.self.takeScreenshot = false;
			if (!takenScreenSizes[that.pagename] || takenScreenSizes[that.pagename].indexOf(that.newScreenSize.width) < 0) {
				/**
				 * set flag to retake screenShot
				 */
				that.self.takeScreenshot = true;

				/**
				 * cache already taken screenshot / screenWidth combinations
				 */
				if (!takenScreenSizes[that.pagename]) {
					takenScreenSizes[that.pagename] = [that.newScreenSize.width];
				} else {
					takenScreenSizes[that.pagename].push(that.newScreenSize.width);
				}
			}

			/**
			 * if shot will be taken in a specific screenWidth, rename file and append screen width
			 * value in filename
			 */
			that.baselinePath = that.baselinePath.replace(/\.(baseline|regression|diff)\.png/, '.' + that.newScreenSize.width + 'px.$1.png');
			that.regressionPath = that.regressionPath.replace(/\.(baseline|regression|diff)\.png/, '.' + that.newScreenSize.width + 'px.$1.png');
			that.diffPath = that.diffPath.replace(/\.(baseline|regression|diff)\.png/, '.' + that.newScreenSize.width + 'px.$1.png');
			that.screenshot = that.screenshot.replace(/\.png/, '.' + that.newScreenSize.width + 'px.png');
			that.filename = that.baselinePath;

			/**
			 * resize browser resolution
			 */
			that.instance.setViewportSize({width: that.newScreenSize.width, height: that.newScreenSize.height})
				.pause(100)
				.call(cb);
		}
	], done);
};
