'use strict';

var glob = require('glob'),
    fs   = require('fs');

module.exports = function() {
    var done = arguments[arguments.length - 1];

    glob('{' + this.regressionPath + ',' + this.baselinePath + '}', {}, function(err,files) {

        /**
         * if no files were found continue
         */
        if(files.length === 0) {
            return done();
        }

		if (this.updateBaseline) {
			var baseline = this.baselinePath;
			var regression = this.regressionPath;

			try {
				if (files.indexOf(baseline) != -1) {
					fs.unlinkSync(baseline);
				}
				if (files.indexOf(regression) != -1) {
					fs.unlinkSync(regression);
				}
			} catch (e) {
				return done(e);
			}
		} else {
			this.isComparable = true;
			this.filename = this.regressionPath;
		}
		return done();
    }.bind(this));
};
