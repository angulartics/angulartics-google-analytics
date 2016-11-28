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
      exception: false,
      ecommerce: false,
      userTiming: false,
      setUserProperties: false,
      userId: false
    },
    disableEventTracking: null,
    disablePageTracking: null,
    enhancedEcommerce: false, 
    // GA supports transporting data via gif requests, XHRs, or sendBeacons
    // @link https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#transport
    transport: null,
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

    dispatchToGa('pageview', 'send', angular.extend({}, properties, {
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
      return;
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

    dispatchToGa('event', 'send', angular.extend({}, properties, {
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
    dispatchToGa('exception', 'send', {
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
      dispatchToGa('setUserProperties', 'set', dimensionsAndMetrics(properties));
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
   *     'optSampleRate' (number) Classic Analytics only - determines % of users to collect data from, handled serverside by UA
   *     @link https://developers.google.com/analytics/devguides/collection/analyticsjs/user-timings#sampling_considerations
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

    dispatchToGa('userTiming', 'send', {
      hitType: 'timing',
      timingCategory: properties.timingCategory,
      timingVar: properties.timingVar,
      timingValue: properties.timingValue,
      timingLabel: properties.timingLabel,
      optSampleRate: properties.optSampleRate,  // Classic Analytics only
      page: properties.page || window.location.hash.substring(1) || window.location.pathname,
    });

  });

  /**
   * Ecommerce Tracking in GA
   * @name transactionTrack
   *
   * @param {object} transaction comprised of following fields:
   *     'id': 'T12345',                         // Transaction ID. Required for purchases and refunds.
   *     'affiliation': 'Online Store',
   *     'revenue': '35.43',                     // Total transaction value (incl. tax and shipping)
   *     'tax':'4.90',
   *     'shipping': '5.99',
   *     'coupon': 'SUMMER_SALE',                // Enhanced Ecommerce Only
   *     'dimension1': 'Card ID #1234',          // Hit, Session, or User-level Custom Dimension(s)
   *     'metric1': 1,                           // Custom Metric(s)
   *     'currencyCode': 'EUR',                  // Currency Code to track the transaction with. Recognized codes: https://support.google.com/analytics/answer/6205902?hl=en#supported-currencies
   *     'billingCity': 'San Francisco',                // Classic Analytics only
   *     'billingRegion': 'California',                 // Classic Analytics only
   *     'billingCountry': 'USA',                       // Classic Analytics only
   *     'products': [{                            // List of products
   *       'name': 'Triblend Android T-Shirt',     // Name or ID is required.
   *       'id': '12345',                          // Product SKU
   *       'price': '15.25',
   *       'brand': 'Google',                      // Enhanced Ecommerce only
   *       'category': 'Apparel',                 
   *       'variant': 'Gray',                      // Enhanced Ecommerce only
   *       'quantity': 1,
   *       'coupon': '',                           // Enhanced Ecommerce only.
   *       'currencyCode': 'BRL',                  // Product-level currency code, Enhanced Ecommerce only
   *       'dimension2': 'Clearance',              // Product-level Custom Dimension
   *       'metric2': 1                            // Product-level Custom Metric
   *      },
   *      ...
   *    ]
   *
   * @param {object] properties comprised of custom dimensions and metrics to
   * send with the transaction hit
   * Utilizes traditional ecommerce tracking by default. To used Enhanced Ecommerce,
   * set the $analytics.settings.ga.enhancedEcommerce flag to true
   *
   * Docs on traditional ecommerce (UA):
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/ecommerce
   *
   * Docs on Enhanced Ecommerce
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/enhanced-ecommerce
   *
   * Docs on Classic Ecommerce (_gaq)
   * @link https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingEcommerce
   **/
  $analyticsProvider.registerTransactionTrack(function(transaction) {

    var product;
    var i;

    // Universal Analytics splits off the ecommerce code into a separate
    // library we must include by using the "require" command
    dispatchToGa('ecommerce', 'require', 'ecommerce');
    dispatchToGa('ecommerce', 'ecommerce:addTransaction', transaction);
    
    if (transaction.products) {
      for (i = 0; i < transaction.products.length; i++) {

        product = transaction.products[i];

        // GA uses a SKU property and stores the transaction ID in the ID Field
        product.sku = product.id;
        product.id = transaction.id;

        dispatchToGa('ecommerce', 'ecommerce:addItem', transaction.products[i]);

      }
    }

    if (transaction.currencyCode) {

      dispatchToGa('ecommerce', '_set', transaction.currencyCode); // Classic Anayltics only - UA uses fieldsObj.currencyCode instead

    } 

    dispatchToGa('ecommerce', 'ecommerce:send', angular.copy(transaction));

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
    return !angular.isUndefined(window._gaq);

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
   * @param {string} method Name of angulartics method for checking if hits should be duplicated
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
      return angular.noop;
    }

    return function(method, command, fieldsObj) {

      var shouldCopyHit = $analyticsProvider.settings.ga.additionalAccountHitTypes[method];
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

      var userId = $analyticsProvider.settings.ga.userId;
      var uaCommand,
          pluginName;

      if (command === 'require' && fieldsObj === 'ecommerce') {

        pluginName = fieldsObj;
  
        if ($analyticsProvider.settings.ga.enhancedEcommerce) {
  
          pluginName = 'ec';

        }
      
        // Exit here - require calls don't have fieldsObjs
        return applyUniversalCall_([command, pluginName], shouldCopyHit);

      }

      // If our User ID is set, set it on the hit
      if (userId && angular.isObject(fieldsObj)) fieldsObj.userId = userId;
      // If a transport preference is specified, set it on the hit
      if ($analyticsProvider.settings.ga.transport) {

        fieldsObj.transport = $analyticsProvider.settings.ga.transport;

      }

      if (command.indexOf('ecommerce:') > -1 && $analyticsProvider.settings.ga.enhancedEcommerce) {

        switch (command) {
          case 'ecommerce:addTransaction':
            command = ['ec:setAction', 'purchase'];
            break;
          case 'ecommerce:addItem':
            command = 'ec:addProduct';
            // Enhanced Ecommerce reverts to using the ID property for the SKU,
            // so we swap them back here
            fieldsObj.id = fieldsObj.sku;
            break;
          case 'ecommerce:send':
            command = 'send';
            fieldsObj.hitType = 'event';
            fieldsObj.eventCategory = 'Angulartics Enhanced Ecommerce';
            fieldsObj.eventAction = 'Purchase';
            fieldsObj.nonInteraction = true;
            break;
        }

      }


      uaCommand = command instanceof Array ? command.concat(fieldsObj) : [command, fieldsObj];

      applyUniversalCall_(uaCommand, shouldCopyHit);

    }

    /**
     * Handles applying a constructed call to the global Universal GA object
     * This exists primarily so calls within dispatchToUa_ can short circuit
     * out of the function to handle specific edge cases, e.g. require commands
     * @name applyUniversalCall_
     * @private
     *
     * @param commandArray {array} command to be .apply()'d
     * @param shouldCopyHit {boolean} should the command be applied to all accts
     */
    function applyUniversalCall_(commandArray, shouldCopyHit) {

      var userId = $analyticsProvider.settings.ga.userId;
      var gaNamespace = window.GoogleAnalyticsObject;
      var commandClone;

      // Perform our initial call
      window[gaNamespace].apply(this, commandArray);

      if (shouldCopyHit) {

        commandClone = angular.copy(commandArray);

        // If the userId shouldn't be duplicated, remove from the fieldsObj
        if (userId && !$analyticsProvider.settings.ga.additionalAccountHitTypes.userId) {
          
          if (commandClone[2] && typeof commandClone[2] === 'object') {

            delete commandClone[2].userId;

          }
  
        }

        angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
       
          commandClone[0] = accountName + '.' + commandClone[0];

          window[gaNamespace].apply(this, commandClone);

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
              fieldsObj.timingLabel,
              fieldsObj.optSampleRate
            ];
            break;
        }

      }

      if (command === 'ecommerce:addTransaction') {

        classicCommand = [
          '_addTrans',
          fieldsObj.id,
          fieldsObj.affiliation,
          fieldsObj.revenue,
          fieldsObj.tax,
          fieldsObj.shipping,
          fieldsObj.billingCity,
          fieldsObj.billingRegion,
          fieldsObj.billingCountry
        ];

      }

      if (command === 'ecommerce:addItem') { 

        classicCommand = [
          '_addItem',
          fieldsObj.id,
          fieldsObj.sku,
          fieldsObj.name,
          fieldsObj.category,
          fieldsObj.price,
          fieldsObj.quantity
        ];

      }

      if (command === '_set') {

        classicCommand = [
          '_set',
          'currencyCode',
          fieldsObj
        ];

      }

      if (command === 'ecommerce:send') {

        classicCommand = [
          '_trackTrans' 
        ];

      }

      if (!classicCommand) {
        return console.log('Unable to find command ' + command + ' or fieldsObj missing required properties. Command ignored.');
      }

      // Issue our command to GA
      window._gaq.push(classicCommand);

      if (shouldCopyHit) {

        angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
          
          var classicCommandClone = [].slice.call(classicCommand);
          // Namespace the command as required
          classicCommandClone[0] = accountName + '.' + classicCommandClone[0];

          window._gaq.push(classicCommandClone);

        });

      }

    }

  })();

}]);
})(window, window.angular);
