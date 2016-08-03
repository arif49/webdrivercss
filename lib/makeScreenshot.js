'use strict';
/**
 * make screenShot via [GET] /session/:sessionId/screenShot
 */
var async = require('async'),
    q = require('q');

module.exports = function (done) {
    /**
     * Define local variables and functions
     */
    var self = this,
        hiddenElements = [],
        removeElements = [],
        modifyElementCSS = function (elements, style, value, cb) {
            if (!Array.isArray(elements) || elements.length === 0) {
                cb(null);
            } else {
                self.instance.selectorExecute(elements, function (elements, style, value) {
                    for (var i = 0; i < elements.length; ++i) {
                        elements[i].style[style] = value;
                    }
                }, style, value).then(function () {
                    cb(null)
                });
            }
        };
    /**
     * gather all elements to hide
     */
    self.queuedShots.forEach(function (args) {
        if (typeof args.hide === 'string') {
            hiddenElements.push(args.hide);
        }
        if (args.hide instanceof Array) {
            hiddenElements = hiddenElements.concat(args.hide);
        }
        if (typeof args.remove === 'string') {
            removeElements.push(args.remove);
        }
        if (args.remove instanceof Array) {
            removeElements = removeElements.concat(args.remove);
        }
    });

    /**
     * hide/remove element before taking screen shot of the desired region and then revert them back
     */
    async.waterfall([
        /**
         * Hides target elements
         */
        modifyElementCSS.bind(self, hiddenElements, 'visibility', 'hidden'),
        /**
         * Removes target elements
         */
        modifyElementCSS.bind(self, removeElements, 'display', 'none'),
        /**
         * Get boundary info about target elements
         */
        require('./getElementInfo.js').bind(self),
        /**
         * Take screenShots and save baseline|regression images
         */
        require('./documentScreenshot.js').bind(self),
        /**
         * Makes target elements visible again
         */
        modifyElementCSS.bind(self, hiddenElements, 'visibility', ''),
        /**
         * Brings back removed elements
         */
        modifyElementCSS.bind(self, removeElements, 'display', '')
    ], function (err) {
        done(err)
    });
};
