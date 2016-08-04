'use strict';
/**
 *
 * Saves a screenShot based on defined settings and saves it in the desired path
 *
 *
 * @param {Object}    elemInfo    -Representing current info about the open window and the target element
 *
 * @type utility
 */
var async = require('async'),
	fs = require('fs'),
	gm = require('gm'),
	rimraf = require('rimraf'),
	generateUUID = require('./generateUUID.js'),
	path = require('path'),
	os = require('os');

module.exports = function documentScreenshot(elemInfo, done) {
	/**
	 * Define variables
	 */
	var self = this,
		response = {
			execute: [],
			screenShot: []
		},
		tmpDir = null,
		cropImages = [],
		currentXPos = 0,
		currentYPos = 0,
		screenshot = null,
		scrollFn = function (w, h) {
			document.body.style.WebkitTransform = 'translate(-' + w + 'px, -' + h + 'px)';
			document.body.style.MozTransform = 'translate(-' + w + 'px, -' + h + 'px)';
			document.body.style.OTransform = 'translate(-' + w + 'px, -' + h + 'px)';
			document.body.style.transform = 'translate(-' + w + 'px, -' + h + 'px)';
		},
		exclude = function (shot, excludeRect) {
			if (!Array.isArray(excludeRect)) {
				return;
			}
			excludeRect.forEach(function (rect) {
				if (Object.keys(rect).length > 4) {
					var points = [];
					for (var i = 0; i < Object.keys(rect).length / 2; i++) {
						points.push([rect['x' + i], rect['y' + i]]);
					}
					shot.drawPolygon(points);
				} else {
					shot.drawRectangle(rect.x0, rect.y0, rect.x1, rect.y1);
				}
			});
		};

	async.waterfall([
		/*!
		 * create tmp directory to cache viewport shots
		 */
		function (cb) {
			var uuid = generateUUID();
			tmpDir = path.join(os.tmpdir(), '.tmp-' + uuid);

			fs.exists(tmpDir, function (exists) {
				exists ? cb(null) : fs.mkdir(tmpDir, '0755', function (err) {
					cb(err)
				});
			});
		},
		/*!
		 * Prepare page scan: translate to beginning of target area
		 */
		function (cb) {
			self.instance.execute(scrollFn,
				elemInfo.elemBounding.left,
				elemInfo.elemBounding.top
			).then(function (res) {
				response.execute.push(res);
			}).pause(100).then(function () {
				cb(null)
			});
		},
		/*!
		 * take viewport shots and cache them into tmp dir
		 */
		function (cb) {
			/*!
			 * run scan
			 */
			async.whilst(
				/*!
				 * while expression
				 */
				function () {
					return (currentXPos < (elemInfo.elemBounding.width / elemInfo.screenWidth));
				},
				/*!
				 * loop function
				 */
				function (finishedScreenShot) {
					response.screenShot = [];

					async.waterfall([
						/*!
						 * take screenshot of viewport
						 */
						function (callback) {
							self.instance.screenshot().then(function (imageBuff) {
								callback(null, imageBuff);
							});
						},
						/*!
						 * cache image into tmp dir
						 */
						function (imageBuff, callback) {
							var file = tmpDir + '/' + currentXPos + '-' + currentYPos + '.png';
							var image = gm(new Buffer(imageBuff.value, 'base64'));

							// Fix gecko browser HIGH Dpi issue
							if (elemInfo.devicePixelRatio > 1 && !elemInfo.isFirefox) {
								var percent = 100 / elemInfo.devicePixelRatio;
								image.resize(percent, percent, "%");
							}

							if (!cropImages[currentXPos]) {
								cropImages[currentXPos] = [];
							}
							cropImages[currentXPos][currentYPos] = file;

							currentYPos++;
							if (currentYPos > Math.floor(elemInfo.elemBounding.height / elemInfo.screenHeight)) {
								currentYPos = 0;
								currentXPos++;
							}

							response.screenShot.push(imageBuff);
							image.crop(elemInfo.screenWidth, elemInfo.screenHeight, 0, 0);
							image.write(file, function (err) {
								callback(err)
							});
						},
						/*!
						 * scroll to next area
						 */
						function (callback) {
							self.instance.execute(scrollFn,
								currentXPos * elemInfo.screenWidth + elemInfo.elemBounding.left,
								currentYPos * elemInfo.screenHeight + elemInfo.elemBounding.top
							).then(function (res) {
								response.execute.push(res);
							}).pause(300).then(function () {
								callback(null);
							});
						}
					], finishedScreenShot);
				},
				function (err) {
					cb(err);
				}
			);
		},
		/*!
		 * make the scroll-bar appear again
		 */
		function (cb) {
			self.instance.execute(function () {
				document.body.style.height = '';
				document.body.style.overflow = '';
				document.documentElement.style.overflow = '';
			}).then(function () {
				cb(null);
			})
		},
		/*!
		 * scroll back to start position
		 */
		function (cb) {
			self.instance.execute(scrollFn, 0, 0)
				.then(function (res) {
					response.execute.push(res);
				}).pause(100).then(function () {
					cb(null);
				});
		},
		/*!
		 * Concat all shots
		 */
		function (cb) {
			var subImg = 0;
			var filePath = tmpDir + '/' + self.screenshot.substring(self.screenshot.lastIndexOf('/') + 1);

			async.eachSeries(cropImages, function (x, callback) {
				var col = gm(x.shift());
				col.append.apply(col, x);

				if (!screenshot) {
					screenshot = col;
					col.write(filePath, function (err) {
						callback(err)
					});
				} else {
					col.write(tmpDir + '/' + (++subImg) + '.png', function () {
						gm(filePath).append(tmpDir + '/' + subImg + '.png', true).write(filePath, callback);
					});
				}
			}, function (err) {
				cb(err, filePath);
			});
		},
		/*!
		 * crop screenshot regarding element size
		 */
		function (filePath, cb) {
			var croppedImage = gm(filePath).crop(Math.min(elemInfo.elemBounding.width, self.newScreenSize.width),
				elemInfo.elemBounding.height, 0, 0);
			cb(null, croppedImage)
		},
		/*!
		 * Exclude target region defined either by selector or coordinate + dimension and write the image in disk
		 */
		function (croppedImage, cb) {
			exclude(croppedImage, elemInfo.excludeRect);
			croppedImage.write(self.filename || self.baselinePath, function (err) {
				cb(err)
			});
		}
	], function (err) {
		// remove temp directory and return
		rimraf(tmpDir, function () {
			done(err)
		});
	});
};