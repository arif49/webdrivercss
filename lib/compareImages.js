'use strict';

/**
 * compare images
 */

var resemble = require('node-resemble-js');
resemble.outputSettings({
	errorColor: {
		red: 255,
		green: 0,
		blue: 255
	},
	errorType: 'flat',
	largeImageThreshold: 1920,
	transparency: 0.9
});

module.exports = function () {
	/**
	 * need to find done function because gm doesn't have node like callbacks (err,res)
	 */
	var done = arguments[arguments.length - 1];

	/**
	 * if there is no need for image comparison or no images gets saved on fs, just continue
	 */
	if (!this.isComparable || !this.self.saveImages) {
		return done(null);
	}

	/**
	 * compare images
	 */
	var diff = resemble(this.baselinePath).compareTo(this.regressionPath);

	/**
	 * map 'ignore' configuration to resemble options
	 */
	var ignore = this.currentArgs.ignore || "";

	if (ignore.indexOf("color") === 0) {
		diff.ignoreColors();
	} else if (ignore.indexOf("antialiasing") === 0) {
		diff.ignoreAntialiasing();
	}
	/**
	 * execute the comparison
	 */
	diff.onComplete(done.bind(null, null));
};
