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
    // array of additional account names (only works for analyticsjs)
    additionalAccountNames: undefined,
    userId: null
  };

  function setDimensionsAndMetrics(properties) {
    if (window.ga) {
      // add custom dimensions and metrics
      for(var idx = 1; idx<=200;idx++) {
        if (properties['dimension' +idx.toString()]) {
          ga('set', 'dimension' +idx.toString(), properties['dimension' +idx.toString()]);
        }
        if (properties['metric' +idx.toString()]) {
          ga('set', 'metric' +idx.toString(), properties['metric' +idx.toString()]);
        }
      }
    }
  }

  $analyticsProvider.registerPageTrack(function (path) {
    if (window._gaq) {
      _gaq.push(['_trackPageview', path]);
      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        _gaq.push([accountName + '._trackPageview', path]);
      });
    }
    if (window.ga) {
      if ($analyticsProvider.settings.ga.userId) {
        ga('set', '&uid', $analyticsProvider.settings.ga.userId);
      }
      ga('send', 'pageview', path);
      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        ga(accountName +'.send', 'pageview', path);
      });
    }
  });

  /**
   * Track Event in GA
   * @name eventTrack
   *
   * @param {string} action Required 'action' (string) associated with the event
   * @param {object} properties Comprised of the mandatory field 'category' (string) and optional  fields 'label' (string), 'value' (integer) and 'noninteraction' (boolean)
   *
   * @link https://developers.google.com/analytics/devguides/collection/gajs/eventTrackerGuide#SettingUpEventTracking
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  $analyticsProvider.registerEventTrack(function (action, properties) {

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

    if (window.ga) {

      var eventOptions = {
        eventCategory: properties.category,
        eventAction: action,
        eventLabel: properties.label,
        eventValue: properties.value,
        nonInteraction: properties.noninteraction,
        page: properties.page || window.location.hash.substring(1) || window.location.pathname,
        userId: $analyticsProvider.settings.ga.userId
      };

      // add custom dimensions and metrics
      setDimensionsAndMetrics(properties);

      if ($analyticsProvider.settings.ga.transport) {
        ga('send', 'event', eventOptions, { transport: $analyticsProvider.settings.ga.transport});
      }
      else {
        ga('send', 'event', eventOptions);
      }

      angular.forEach($analyticsProvider.settings.ga.additionalAccountNames, function (accountName){
        ga(accountName +'.send', 'event', eventOptions);
      });
    }

    else if (window._gaq) {
      _gaq.push(['_trackEvent', properties.category, action, properties.label, properties.value, properties.noninteraction]);
    }

  });

  /**
   * Exception Track Event in GA
   * @name exceptionTrack
   *
   * @param {object} properties Comprised of the mandatory fields 'appId' (string), 'appName' (string) and 'appVersion' (string) and 
   * optional  fields 'fatal' (boolean) and 'description' (string)
   *
   * @https://developers.google.com/analytics/devguides/collection/analyticsjs/exceptions
   *
   * @link https://developers.google.com/analytics/devguides/collection/analyticsjs/events
   */
  $analyticsProvider.registerExceptionTrack(function (properties) {
    if (!properties || !properties.appId || !properties.appName || !properties.appVersion) {
        console.error('Must be setted appId, appName and appVersion.');
        return;
    }

    if(properties.fatal === undefined) {
        console.log('No "fatal" provided, sending with fatal=true');
        properties.exFatal = true;
    }

    properties.exDescription = properties.description;

    ga('send', 'exception', properties);
  });

  $analyticsProvider.registerSetUsername(function (userId) {
    $analyticsProvider.settings.ga.userId = userId;
  });

  $analyticsProvider.registerSetUserProperties(function (properties) {
    // add custom dimensions and metrics
    setDimensionsAndMetrics(properties);
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
    if (!properties || !properties.timingCategory || !properties.timingVar || !properties.timingValue) {
      console.error('Properties timingCategory, timingVar, and timingValue are required to be set.');
      return;
    }

    if(window.ga) {
      ga('send', 'timing', properties);
    }
  });

}]);
})(window, window.angular);
