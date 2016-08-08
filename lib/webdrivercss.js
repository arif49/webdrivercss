'use strict';

/**
 * WebdriverCSS
 */

var workflow = require('./workflow.js'),
    viewportScreenshot = require('./viewportScreenshot.js'),
    generateUUID = require('./generateUUID.js');

/**
 * initialise plugin
 */
var WebdriverCSS = function (webdriverInstance, options) {
    options = options || {};

    if (!webdriverInstance) {
        throw new Error('A WebdriverIO instance is needed to initialise WebdriverCSS');
    }

    /**
     * general options
     */
    this.screenshotRoot = options.screenshotRoot || 'webdrivercss';
    this.failedComparisonsRoot = options.failedComparisonsRoot || (this.screenshotRoot + '/diff');
    this.misMatchTolerance = options.misMatchTolerance || 0.05;
    this.screenWidth = options.screenWidth || [];
    this.warning = [];
    this.resultObject = {};
    this.instance = webdriverInstance;
    this.updateBaseline = (typeof options.updateBaseline === 'boolean') ? options.updateBaseline : false;

    /**
     * add WebdriverCSS command to WebdriverIO instance
     */
    this.instance.addCommand('saveViewportScreenshot', viewportScreenshot.bind(this), true);
    this.instance.addCommand('webdrivercss', workflow.promise.bind(this), true);

    return this;
};

/**
 * expose WebdriverCSS
 */
module.exports.init = function (webdriverInstance, options) {
    return new WebdriverCSS(webdriverInstance, options);
};
