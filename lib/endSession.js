'use strict';

var async = require('async'),
    merge = require('deepmerge'),
    request = require('request');

module.exports = function (done) {

    var that = this;

    async.waterfall([
        /*!
         * if screenWidth was set, get back to old resolution
         */
        function (cb) {
            if (!that.self.defaultScreenDimension) {
                return cb();
            }

            that.instance.windowHandleSize({
                width: that.self.defaultScreenDimension.width,
                height: that.self.defaultScreenDimension.height
            }).then(function (res) {
                cb(null);
            });
        }
    ], function (err) {
        return done(err);
    });
};
