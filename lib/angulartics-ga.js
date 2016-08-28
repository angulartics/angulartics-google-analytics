(function(window, angular, undefined) {'use strict';

/**
 * @ngdoc overview
 * @name angulartics.google.analytics
 * Enables analytics support for Google Analytics (http://google.com/analytics)
 */
angular.module('angulartics.google.analytics', ['angulartics'])
.config(['$analyticsProvider', function ($analyticsProvider) {

  // GA already supports buffered invocations so we don't need
  // to wrap these inside angulartics.waitForVendorApi

  $analyticsProvider.settings.pageTracking.trackRelativePath = true;

  // Set the default settings for this module
  $analyticsProvider.settings.ga = {
    additionalAccountNames: undefined,
    // Select hits to send to all additional accounts
    additionalAccountHitTypes: {
      pageview: true,
      event: true,
      error: false,
      timing: false,
      setUserProperties: false,
      userId: false
    },
    disableEventTracking: null,
    disablePageTracking: null,
    userId: null
  };

  /**
   * Track Pageview in GA
   * @name pageTrack
   *
   * @param {string} path value of Page dimension stored with hit e.g. '/home'
   * @param {object} properties Object with optional addtional Custom Dimensions/Metrics
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/pages
   * @link https://developers.google.com/analytics/devguides/collection/gajs/
   */
  $analyticsProvider.registerPageTrack(function (path, properties) {
    
    properties = properties || {};

    // Do nothing if page tracking is disabled
    if ($analyticsProvider.settings.ga.disablePageTracking) return;

    dispatchToGa('send', angular.extend(dimensionsAndMetrics(properties), {
      hitType: 'pageview',
      page: path
    }));

  });

  /**
   * Track Event in GA
   * @name eventTrack
   *
   * @param {string} action Required 'action' (string) associated with the event
   * @param {object} properties Comprised of the mandatory field 'category' (string) and optional  fields 'label' (string), 'value' (integer) and 'nonInteraction' (boolean)
   *
   * @link https://developers.google.com/analytics/devguides/collection/gajs/eventTrackerGuide#SettingUpEventTracking
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  $analyticsProvider.registerEventTrack(function(action, properties) {

    // Do nothing if event tracking is disabled
    if ($analyticsProvider.settings.ga.disableEventTracking) return;

    if (!action && action + '' !== '0') {
      return console.log('Missing required argument action');
    }

    // Sets default properties
    properties = properties || {};
    properties.category = properties.category || 'Event';

    // GA requires that eventValue be an integer, see:
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventValue
    // https://github.com/luisfarzati/angulartics/issues/81
    if (properties.value) {
      var parsed = parseInt(properties.value, 10);
      properties.value = isNaN(parsed) ? 0 : parsed;
    }

    // GA requires that hitCallback be an function, see:
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/sending-hits#hitcallback
    if (!angular.isFunction(properties.hitCallback)) {
      properties.hitCallback = null;
    }

    // Making nonInteraction parameter more intuitive, includes backwards compatibilty
    // https://github.com/angulartics/angulartics-google-analytics/issues/49
    properties.nonInteraction = properties.nonInteraction || properties.noninteraction;

    dispatchToGa('send', angular.extend(dimensionsAndMetrics(properties), {
      hitType: 'event',
      eventCategory: properties.category,
      eventAction: action,
      eventLabel: properties.label,
      eventValue: properties.value,
      nonInteraction: properties.nonInteraction,
      page: properties.page || window.location.hash.substring(1) || window.location.pathname,
      hitCallback: properties.hitCallback,
    }));

  });

  /**
   * Exception Track Event in GA
   * @name exceptionTrack
   * Sugar on top of the eventTrack method for easily handling errors
   *
   * @param {object} error An Error object to track: error.toString() used for event 'action', error.stack used for event 'label'.
   * @param {object} cause The cause of the error given from $exceptionHandler, not used.
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  $analyticsProvider.registerExceptionTrack(function (error, cause) {
    dispatchToGa('send', {
      hitType: 'event',
      eventCategory: 'Exceptions',
      eventAction: error.toString(),
      eventLabel: error.stack,
      nonInteraction: true,
      page: window.location.hash.substring(1) || window.location.pathname,
      isException: true
    });
  });

  /**
   * Set Username
   * @name setUsername
   *
   * @param {string} userId Registers User ID of user for use with other hits
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/cookies-user-id#user_id
   */
  $analyticsProvider.registerSetUsername(function (userId) {
    $analyticsProvider.settings.ga.userId = userId;
  });

  /**
   * Set User Properties
   * @name setUserProperties
   *
   * @param {object} properties Sets all properties with dimensionN or metricN to their respective values
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#customs
   */
  $analyticsProvider.registerSetUserProperties(function (properties) {

    if (properties) {
      dispatchToGa('set', dimensionsAndMetrics(properties));
    }

  });

  /**
   * User Timings Event in GA
   * @name userTimings
   *
   * @param {object} properties Comprised of the mandatory fields:
   *     'timingCategory' (string),
   *     'timingVar' (string),
   *     'timingValue' (number)
   * Properties can also have the optional fields:
   *     'timingLabel' (string)
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings
   */
  $analyticsProvider.registerUserTimings(function (properties) {

    if (!angular.isObject(properties) || angular.isArray(properties)) {
      return console.log('Required argument properties is missing or not an object');
    }

    angular.forEach(['timingCategory', 'timingVar', 'timingValue'], function(prop) {
      if (angular.isUndefined(properties[prop])) {
        return console.log('Argument properties missing required property ' + prop);
      }
    });

    dispatchToGa('send', {
      hitType: 'timing',
      timingCategory: properties.timingCategory,
      timingVar: properties.timingVar,
      timingValue: properties.timingVar,
      timingLabel: properties.timingLabel,
      page: properties.page || window.location.hash.substring(1) || window.location.pathname,
    });

  });

  /**
   * Detects if Universal Analytics is installed
   *
   * @name detectUniversalAnalytics
   */
  function detectUniversalAnalytics() {

    // Use the GoogleAnalyticsObject property set by the default GA snippet
    // to correctly determine the namespace of the GA global
    var gaNamespace = window.GoogleAnalyticsObject;
    return gaNamespace && window[gaNamespace];

  }

  /**
   * Detects if Classic Analytics is installed
   *
   * @name detectClassicAnalytics
   */
  function detectClassicAnalytics() {

    // If _gaq is undefined, we're trusting Classic Analytics to be there
    return angular.isUndefined(window._gaq);

  }

  /**
   * Extract Custom Data for a hit
   * @name dimensionsAndMetrics
   * 
   * @param {object} properties properties object from an API call that is filtered for Custom Dimensions & Metrics
   *
   * @returns {object} customData object with only Custom Dimensions/Metrics from properties argument
   */
  function dimensionsAndMetrics(properties) {
    // add custom dimensions and metrics
    var customData = {};
    var key;

    for (key in properties) {
      // Keys must be dimensionXX or metricXX, e.g. dimension1, metric155, so
      // if those strings aren't at zero (which evaluates to falsey), ignore
      // the key
      if (!key.indexOf('dimension') || !key.indexOf('metric')) {
        customData[key] = properties[key];
      }
    }
    return customData;
  }

  /**
   * Handler for hits to GA. Dynamically adjusts syntax for
   * targeted version based on global detection.
   *
   * @name dispatchToGa
   *
   * @param {string} command Standard Universal Analytics command (create, send, set)
   * @param {object} fieldsObj object with hit-specific fields. Fields are whitelisted in handler - non-supported fields are ignored.
   * 
   */
  var dispatchToGa = (function() {

    var handler;

    if (detectClassicAnalytics()) {
      handler = dispatchToClassic_;
    }

    if (detectUniversalAnalytics()) {
      handler = dispatchToUniversal_;
    }

    // If neither has been detected, GA is not above the angular code
    if (!handler) {
      console.log('Error: neither Classic nor Universal Analytics detected at bootstrap. Angulartics-GA will ignore all commands!');
      return angular.noop;
    }

    return function(command, fieldsObj) {

      var hitType = fieldsObj.hitType === 'event' && fieldsObj.isException ? 'error' : fieldsObj.hitType;
      var shouldCopyHit = $analyticsProvider.settings.ga.additionalAccountHitTypes[hitType];
      console.log(hitType);
      console.log(shouldCopyHit);
      console.log($analyticsProvider.settings.ga.additionalAccountHitTypes);

      handler(command, fieldsObj, shouldCopyHit);

    }

    /**
     * Dispatches a hit using Universal syntax
     *
     * @name dispatchToUniversal_
     * @private
     *  
     * @param {string} command Standard Universal Analytics command (create, send, set)
     * @param {object} fieldsObj object with hit-specific fields. Fields are whitelisted in handler - non-supported fields are ignored.
     * @param {boolean} shouldCopyHit should hit be propogated to all trackers
     */
    function dispatchToUniversal_(command, fieldsObj, shouldCopyHit) {

      var gaNamespace = window.GoogleAnalyticsObject;
      var userId = $analyticsProvider.settings.ga.userId;

      if (userId) fieldsObj.userId = userId;

      window[gaNamespace](command, fieldsObj);

      if (shouldCopyHit) {

        // If the userId shouldn't be duplicated, remove from the fieldsObj
        if (userId && !$analyticsProvider.settings.ga.additionalAccountHitTypes.userId) {
          delete fieldsObj.userId;
        }

        angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
       
          var accountCommand = accountName + '.' + command;
          window[gaNamespace](accountCommand, fieldsObj)

        }); 

      }

    }

    /**
     * Dispatches a hit using Classic syntax
     * Translates Universal Syntax to Classic syntax
     *
     * @name dispatchToClassic_
     * @private
     *  
     * @param {string} command Standard Universal Analytics command (create, send, set)
     * @param {object} fieldsObj object with hit-specific fields. Fields are whitelisted in handler - non-supported fields are ignored.
     * @param {boolean} shouldCopyHit should hit be propogated to all trackers
     */
    function dispatchToClassic_(command, fieldsObj, shouldCopyHit) {

      if (command === 'set') {
        return console.log('Classic Analytics does not support the "set" command or Custom Dimensions. Command ignored.');
      }

      var classicCommand;

      // Transpose our syntax from Universal Analytics to Classic Analytics
      // Currently we only support 'send' style commands
      if (command === 'send') {

        switch(fieldsObj.hitType) {
          case 'pageview':
            classicCommand = ['_trackPageview', fieldsObj.page];
            break;
          case 'event':
            classicCommand = [
              '_trackEvent',
              fieldsObj.category,
              fieldsObj.action,
              fieldsObj.label,
              fieldsObj.value,
              fieldsObj.nonInteraction
            ];
            break;
          case 'timing':
            classicCommand = [
              '_trackTiming',
              fieldsObj.timingCategory,
              fieldsObj.timingVar,
              fieldsObj.timingValue,
              fieldsObj.timingLabel
            ];
            break;
        }

      }

      if (!classicCommand) {
        console.log('Unable to find command ' + command + '. Hit ignored.');
      }

      // Issue our command to GA
      window._gaq.push(classicCommand);

      if (shouldCopyHit) {

        angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
          
          // Namespace the command as required per:
          classicCommand[0] = accountName + '.' + classicCommand[0];
          window._gaq.push(classicCommand);

        });

      }

    }

  })();

}]);
})(window, window.angular);
