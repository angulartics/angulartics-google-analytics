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
    disableEventTracking: null,
    disablePageTracking: null,
    userId: null,
    enhancedEcommerce: false    
  };

  function dimensionsAndMetrics(properties) {
    if (detectUniversalAnalytics()) {
      // add custom dimensions and metrics
      var customData = {};
      var key;

      for (key in properties) {
        if (!key.indexOf('dimension') || !key.indexOf('metric')) {
          customData[key] = properties[key];
        }
      }
      return customData;
    }
  }

  $analyticsProvider.registerPageTrack(function (path, properties) {
    
    // Do nothing if page tracking is disabled
    if ($analyticsProvider.settings.ga.disablePageTracking) return;

    if (detectClassicAnalytics()) {
      _gaq.push(['_trackPageview', path]);
      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        _gaq.push([accountName + '._trackPageview', path]);
      });
    }
    if (detectUniversalAnalytics()) {
      var dimsAndMets = dimensionsAndMetrics(properties);
      if ($analyticsProvider.settings.ga.userId) {
        ga('set', 'userId', $analyticsProvider.settings.ga.userId);
      }
      ga('send', 'pageview', path, dimsAndMets);
      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        ga(accountName +'.send', 'pageview', path, dimsAndMets);
      });
    }
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
  $analyticsProvider.registerEventTrack(eventTrack);

  function eventTrack (action, properties) {

    // Do nothing if event tracking is disabled
    if ($analyticsProvider.settings.ga.disableEventTracking) return;

    // Google Analytics requires an Event Category
    if (!properties || !properties.category) {
      properties = properties || {};
      properties.category = 'Event';
    }
    // GA requires that eventValue be an integer, see:
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/field-reference#eventValue
    // https://github.com/luisfarzati/angulartics/issues/81
    if (properties.value) {
      var parsed = parseInt(properties.value, 10);
      properties.value = isNaN(parsed) ? 0 : parsed;
    }

    // GA requires that hitCallback be an function, see:
    // https://developers.google.com/analytics/devguides/collection/analyticsjs/sending-hits#hitcallback
    if (properties.hitCallback && (typeof properties.hitCallback !== 'function')) {
      properties.hitCallback = null;
    }

    // Making nonInteraction parameter more intuitive, includes backwards compatibilty
    // https://github.com/angulartics/angulartics-google-analytics/issues/49
    if (!properties.hasOwnProperty('nonInteraction')) {
      properties.nonInteraction = properties.noninteraction;
    }

    if (detectUniversalAnalytics()) {

      var eventOptions = {
        eventCategory: properties.category,
        eventAction: action,
        eventLabel: properties.label,
        eventValue: properties.value,
        nonInteraction: properties.nonInteraction,
        page: properties.page || window.location.hash.substring(1) || window.location.pathname,
        userId: $analyticsProvider.settings.ga.userId,
        hitCallback: properties.hitCallback
      };

      // Round up any dimensions and metrics for this hit
      var dimsAndMets = dimensionsAndMetrics(properties);
      angular.extend(eventOptions, dimsAndMets);

      // Add transport settings
      if($analyticsProvider.settings.ga.transport) {
        angular.extend(eventOptions, $analyticsProvider.settings.ga.transport);
      }

      ga('send', 'event', eventOptions);

      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        ga(accountName +'.send', 'event', eventOptions);
      });

    } else if (detectClassicAnalytics()) {
      _gaq.push(['_trackEvent', properties.category, action, properties.label, properties.value, properties.nonInteraction]);
    }

  }

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
    eventTrack(error.toString(), {
      category: 'Exceptions',
      label: error.stack,
      nonInteraction: true
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
    if(properties && detectUniversalAnalytics()) {
      // add custom dimensions and metrics to each hit
      var dimsAndMets = dimensionsAndMetrics(properties);
      ga('set', dimsAndMets);
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
    if (!properties || !properties.timingCategory || !properties.timingVar || typeof properties.timingValue === 'undefined') {
      console.log('Properties timingCategory, timingVar, and timingValue are required to be set.');
      return;
    }

    if(detectUniversalAnalytics()) {
      ga('send', 'timing', properties);
    }
  });

  /**
   * Ecommerce Tracking in GA
   * @name transactionTrack
   *
   * @param {object} transaction comprised of mandatory fields:
   *     'id': 'T12345',                         // Transaction ID. Required for purchases and refunds.
   *     'affiliation': 'Online Store',
   *     'revenue': '35.43',                     // Total transaction value (incl. tax and shipping)
   *     'tax':'4.90',
   *     'shipping': '5.99',
   *     'coupon': 'SUMMER_SALE',                // Enhanced Ecommerce Only
   *     'dimension1': 'Card ID #1234',          // Hit, Session, or User-level Custom Dimension(s)
   *     'metric1': 1,                           // Custom Metric(s)
   *     'currencyCode': 'EUR',                  // Currency Code to track the transaction with. Recognized codes: https://support.google.com/analytics/answer/6205902?hl=en#supported-currencies
   *     'city': 'San Francisco',                // Classic Analytics only
   *     'region': 'California',                 // Classic Analytics only
   *     'country': 'USA',                       // Classic Analytics only
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
   *
   * Docs on Classic Ecommerce (_gaq)
   * @link https://developers.google.com/analytics/devguides/collection/gajs/gaTrackingEcommerce
   **/
  $analyticsProvider.registerTransactionTrack(function(transaction) {

    if (!transaction.id && transaction.id + '' !== '0') {

      return console.log('Missing required field transaction.id');

    }

    if (detectUniversalAnalytics()) {

      return transactionTrackUa(transaction);

    } if else (detectClassicAnalytics()) {

      return transactionTrackClassic(transaction);

    }

  });

  function transactionTrackUa(transaction) {

    // Detect whether the plugin has been configured for traditional or enhanced
    var isEnhancedEcommerce = $analyticsProvider.settings.ga.enhancedEcommerce;
    // Dynamically establish the name of the Google Analytics plugin we'll need to require
    var plugin = isEnhancedEcommerce ? 'ec' : 'ecommerce';
    // Dynamically establish the name of the command that creates a transaction
    var addTransCmd = isEnhancedEcommerce ? ['ec:setAction', 'purchase'] : ['ecommerce:addTransaction'];
    // Dynamically establish the name of the command that adds an item to the purchase
    var addItemCmd = isEnhancedEcommerce ? 'ec:addProduct' : 'ecommerce:addItem';
    // Get any dimensions and metrics set on the transaction ready
    var dimsAndMets = dimensionsAndMetrics(transaction);
    // Create our purchase object. EE properties are ignored by GA if the
    // transaction is being tracked with traditional ecommerce, so we
    // set those even if the hit isn't an EE transaction
    var purchase = {
      id: transaction.id,
      affiliation: transaction.affiliation,
      revenue: transaction.revenue,
      tax: transaction.tax,
      shipping: transaction.shipping,
      coupon: transaction.coupon,  // Enhanced Ecommerce only
      currency: transaction.currency,
      currencyCode: transaction.currency
    };
    // Declare some variables for later
    var product;
    var item;
    var i;

    if (!isEnhancedEcommerce) {

      angular.extend(purchase, dimsAndMets);

    }
  
    // Add our purchase to our addTransCmd
    addTransCmd.push(purchase); 

    // Tell Google Analytics to load the necessary plugin
    ga('require',  plugin);

    ga.apply(this, addTransCmd);

    for (i = 0; i < transaction.products.length; i++) {

      product = transaction.products[i];
      // Products can have product-level custom dimensions
      // and metrics, so we fish any of those out of the
      // product object and then extend the result with
      // the standard product fields.
      item = angular.extend(dimensionsAndMetrics(product), {
        name: product.name,
        price: product.price,
        category: product.category,
        quantity: product.quantity
      });

      // If we're using Enhanced Ecommerce, add in EE-specific
      // product fields, too
      if (isEnhancedEcommerce) {

        item.brand = product.brand;
        item.variant = product.variant;
        item.coupon = product.coupon;
        item.id = product.id;
        item.currencyCode = product.currencyCode;

      } else {

        // Traditional ecommerce requires the Transaction ID as a field
        // for all products
        item.id = transaction.id;
        item.sku = product.id;
        item.currency = product.currencyCode;

      }
  
      // Issue the command to add our item to the transaction
      ga(addItemCmd, item);

    }

    if (isEnhancedEcommerce) {

      // Enhanced Ecommerce data must be combined with
      // another hit, and is not transmitted by itself.
      // Google Analytics will send the transaction we've created
      // with the next hit we dispatch, then clear the stored data
      // and since GA won't read the dims and mets off our transaction
      // we need to apply them to our Event hit instead.
      eventTrack(purchase.id, angular.extend(dimsAndMets, {
        category: 'Enhanced Ecommerce',
        nonInteraction: true
      })); 

    } else {

      // Dispatch the transaction per usual
      ga('ecommerce:send', dimsAndMets);

    }

  });

  function transactionTrackClassic(transaction) {

    // Build our purchase array
    var purchase = [
      '_addTrans'
      transaction.id,
      transaction.affiliation,
      transaction.total,
      transaction.tax,
      transaction.shipping,
      transaction.city,
      transaction.region,
      transaction.country
    ];
    var product;
    var item;
    var i;

    // Issue the command to create a purchase
    _gaq.push(purchase);

    // Add in our products
    for (i = 0; i < transaction.products.length; i++) {

      product = products[i];
      item = [
        '_addItem',
        transaction.id,
        product.sku,
        product.name,
        product.category,
        product.price,
        product.quantity
      ];

      _gaq.push(item);

    }

    // If a currencyCode is set for the transaction, set it
    if (transaction.currencyCode) {

     _gaq.push(['_set', 'currencyCode', transaction.currencyCode]);

    }

    // Issue the command to fire our transaction
    _gaq.push(['_trackTrans']);

  }

  function detectUniversalAnalytics() {

    // The Google Analytics snippet stores the name of the GA Global
    // in the window property GoogleAnalyticsObject. Detecting UA
    // with this parameter accounts for edge cases where the user
    // has manually changed this value by adjusting the default
    // snippet.
    var gaNamespace = window.GoogleAnalyticsObject;
    return gaNamespace && window[gaNamespace];

  }

  function detectClassicAnalytics() {

    // If _gaq is undefined, we're trusting Classic Analytics to be there
    return typeof window._gaq !== 'undefined';

  }

}]);
})(window, window.angular);
