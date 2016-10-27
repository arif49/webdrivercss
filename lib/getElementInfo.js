'use strict';
/**
 * get element information
 * IMPORTANT: all of this code gets executed on browser side, so you won't have
 *            access to node specific interfaces at all
 */
var async = require('async'),
    merge = require('deepmerge');

/**
 * little helper function to check against argument values
 * @param  {Object}  variable  some variable
 * @return {Boolean}           is true if typeof variable is number
 */
function isNumber(variable) {
    return typeof variable === 'number';
}

module.exports = function (done) {
    var that = this,
        response = {
            excludeRect: [],
            scrollPos: {x: 0, y: 0}
        },
        element = that.currentArgs.elem;

    async.waterfall([
        /*!
         * get page information
         */
        function (cb) {
            that.instance.execute(function () {
                var html = document.documentElement,
                    body = document.body;
                /**
                 * scroll back to start scanning
                 */
                window.scrollTo(0, 0);
                /**
                 * get viewport width/height and total width/height
                 */
                var height = Math.max(
                    Math.max(body.scrollHeight, html.scrollHeight),
                    Math.max(body.offsetHeight, html.offsetHeight),
                    Math.max(body.clientHeight, html.clientHeight)
                );
                /**
                 * Setting body height to calculated max height
                 */
                body.style.height = height + 'px';

                return {
                    title: document.title,
                    scrollPos: {x: 0, y: 0},
                    screenWidth: Math.max(html.clientWidth, window.innerWidth || 0),
                    screenHeight: Math.max(html.clientHeight, window.innerHeight || 0),
                    documentWidth: html.scrollWidth,
                    documentHeight: height,
                    devicePixelRatio: window.devicePixelRatio,
                    isFirefox: navigator.userAgent.toLowerCase().indexOf('firefox') > 0
                };
            }).then(function (pageInfo) {
                cb(null, pageInfo);
            });
        },
        /*!
         * get element boundary information
         */
        function (res, cb) {
            response = merge(response, res.value);

            var x = parseInt(that.currentArgs.x, 10);
            var y = parseInt(that.currentArgs.y, 10);
            var width = parseInt(that.currentArgs.width, 10);
            var height = parseInt(that.currentArgs.height, 10);
            /**
             * Target specific region from given coordinate and width|height
             */
            if (!isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height)) {
                var elementInfo = {
                    elemBounding: {
                        width: width,
                        height: height,
                        top: y,
                        bottom: y + height,
                        left: x,
                        right: x + width
                    }
                };
                return cb(null, elementInfo);
            } else {
                /**
                 * Target specific element selector e.g. css selector, xpath etc
                 */
                if (!element) {
                    return cb(null, {});
                }
                /**
                 * needs to get defined that verbose to make it working i15+44n IE driver
                 */
                that.instance.selectorExecute(element, function (elem) {
                    var boundingRect = elem[0].getBoundingClientRect();
                    return {
                        elemBounding: {
                            width: boundingRect.width ? boundingRect.width : boundingRect.right - boundingRect.left,
                            height: boundingRect.height ? boundingRect.height : boundingRect.bottom - boundingRect.top,
                            top: boundingRect.top,
                            right: boundingRect.right,
                            bottom: boundingRect.bottom,
                            left: boundingRect.left
                        }
                    };
                }).then(function (elementInfo) {
                    cb(null, elementInfo);
                });
            }
        },
        /*!
         * get information about exclude elements
         */
        function (res, cb) {
            response = merge(response, res);
            /**
             * concatenate exclude elements to one dimensional array
             * excludeElements = elements queried by specific selector strategy (typeof string)
             * excludeCoords = x & y coords to exclude custom areas
             */
            var excludeElements = [];

            if (!that.currentArgs.exclude) {
                return cb(null);
            } else if (!(that.currentArgs.exclude instanceof Array)) {
                that.currentArgs.exclude = [that.currentArgs.exclude];
            }

            that.currentArgs.exclude.forEach(function (excludeElement) {
                if (typeof excludeElement === 'string') {
                    excludeElements.push(excludeElement);
                } else {
                    /**
                     * excludeCoords are a set of x,y rectangle
                     * then just check if the first 4 coords are numbers (minumum to span a rectangle)
                     */
                    if (isNumber(excludeElement.x0) && isNumber(excludeElement.x1) && isNumber(excludeElement.y0) && isNumber(excludeElement.y1)) {
                        response.excludeRect.push(excludeElement);
                    }
                    /**
                     * Adjust element offset
                     */
                    Object.keys(excludeElement).forEach(function (key) {
                        if (key.startsWith('x')) {
                            excludeElement[key] = parseInt(excludeElement[key], 10) - response.elemBounding.left
                        } else {
                            excludeElement[key] = parseInt(excludeElement[key], 10) - response.elemBounding.top
                        }
                    });
                }
            });

            if (excludeElements.length === 0) {
                return cb(null);
            }

            var count = 0;
            async.whilst(
                function () {
                    return count < excludeElements.length;
                },
                function (callback) {
                    that.instance.selectorExecute(excludeElements[count], function (elem, elemBounding) {
                        var elemRect = elem[0].getBoundingClientRect();
                        return {
                            x0: elemRect.left - elemBounding.left,
                            y0: elemRect.top - elemBounding.top,
                            x1: elemRect.left - elemBounding.left + elemRect.width,
                            y1: elemRect.top - elemBounding.top + elemRect.height
                        };
                    }, response.elemBounding).then(function (res) {
                        count++;
                        response.excludeRect.push(res);
                        callback(null);
                    });
                },
                function (err) {
                    return cb(err);
                }
            );
        }
    ], function (err) {
        done(err, response);
    });
};