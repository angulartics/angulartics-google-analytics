/**
 * Tests for the Google Analytics plugin for the Angulartics project
 *
 * Tests are run by calling methods and inspecting what gets pushed into either
 * the ga.q array or the _gaq array
 *
 */
describe('angulartics-ga', function() {
  'use strict';

  var analytics,
      window,
      location,
      rootScope;

  describe('universal analytics', function() {

    /*
     * Mocks our $window w/ Universal Analytics installed
     */
    beforeEach(module(function($provide) {

      var windowMock = {
        GoogleAnalyticsObject: 'ga',
        location: {
          hash: ''
        }
      }; 

      windowMock.ga = function(){(windowMock.ga.q=windowMock.ga.q||[]).push(arguments)};

      $provide.value('$window', windowMock);

    }));
    beforeEach(module('angulartics'));
    beforeEach(module('angulartics.google.analytics'));

    beforeEach(inject(function(_$analytics_, _$window_, _$location_, _$rootScope_) {

      analytics = _$analytics_;
      window = _$window_;
      location = _$location_;
      rootScope = _$rootScope_;

      location.path('/abc');
      rootScope.$emit('$routeChangeSuccess');
      rootScope.$apply();

    }));

    /*
     * Tests auto-pageview functionality
     */
    it ('should track a pageview', function(done) {

      var cmd = window.ga.q.pop();
      var cmdName = cmd[0];
      var opts = cmd[1];

      expect(cmdName).toEqual('send');
      expect(opts.page).toEqual('/abc');
      expect(opts.hitType).toEqual('pageview');

      done();

    });

    /*
     * Tests pageview functionality
     */
    it ('should track a pageview', function(done) {

      analytics.pageTrack('/efg');

      var cmd = window.ga.q.pop();
      var cmdName = cmd[0];
      var opts = cmd[1];

      expect(cmdName).toEqual('send');
      expect(opts.page).toEqual('/efg');
      expect(opts.hitType).toEqual('pageview');

      done();

    });

    it ('should track an event', function(done) {

      analytics.eventTrack('foo', {
        category: 'bar',
        label: 'baz',
        value: 1,
        nonInteraction: true,
        hitCallback: function() { return 'biz' }
      });

      var cmd = window.ga.q.pop();
      var cmdName = cmd[0];
      var opts = cmd[1];

      expect(cmdName).toEqual('send');
      expect(opts.page).toEqual('/abc');
      expect(opts.hitType).toEqual('event');
      expect(opts.eventCategory).toEqual('bar');
      expect(opts.eventAction).toEqual('foo');
      expect(opts.eventLabel).toEqual('baz');
      expect(opts.eventValue).toEqual(1);
      expect(opts.nonInteraction).toEqual(true);
      expect(opts.hitCallback()).toEqual('biz');

      done();

    });

		it ('should track an exception', function(done) {

			function foo() {

				var err = 'Bar';

				throw new Error(err);

			}

			try {

				foo();

			} catch(e) {

				analytics.exceptionTrack(e);

			}

			var cmd = window.ga.q.pop();
			var cmdName = cmd[0];
			var opts = cmd[1];

			expect(cmdName).toBe('send');
			
			expect(opts.eventAction).toBe('Error: Bar');
			expect(opts.eventCategory).toBe('Exceptions');
			// Just checking the length of the error stack string rather than pasting it here
			expect(opts.eventLabel && opts.eventLabel.length > 0).toBe(true);
			expect(opts.hitType).toBe('event');
			expect(opts.nonInteraction).toBe(true);
			expect(opts.page).toBe('/abc');	
	
			done();

		});

    it ('should track an ecommerce transaction', function(done) {

      analytics.transactionTrack({
        'id': 'Test Enhanced Ecommerce',                         // Transaction ID. Required for purchases and refunds.
        'revenue': '35.43',                     // Total transaction value (incl. tax and shipping)
        'tax':'4.90',
        'shipping': '5.99',
        'dimension10': 'Card ID #1234',          // Hit, Session, or User-level Custom Dimension(s)
        'metric1': 1,                           // Custom Metric(s)
        'currencyCode': 'BRL',
        'region': 'BRL', 
        'products': [{                            // List of productFieldObjects.
          'name': 'Triblend Android T-Shirt',     // Name or ID is required.
          'id': '12345',                          // Equivalent to product SKU
          'price': '15.25',
          'category': 'Apparel',
          'quantity': 1,
          'dimension2': 'Clearance',              // Product-level Custom Dimension
          'metric2': 1                            // Product-level Custom Metric
         }   
       ]   
      }); 

      var requireCmd = window.ga.q[2];
      var transCmd = window.ga.q[3];
      var itemCmd = window.ga.q[4];
      var sendCmd = window.ga.q[6];

      expect(requireCmd[0]).toBe('require');
      expect(requireCmd[1]).toBe('ecommerce');

      expect(transCmd[0]).toBe('ecommerce:addTransaction');
      expect(transCmd[1].id).toBe('Test Enhanced Ecommerce');
      expect(transCmd[1].revenue).toBe('35.43');
      expect(transCmd[1].tax).toBe('4.90');
      expect(transCmd[1].shipping).toBe('5.99');
      expect(transCmd[1].dimension10).toBe('Card ID #1234');
      expect(transCmd[1].metric1).toEqual(1);
      expect(transCmd[1].currencyCode).toBe('BRL');
      expect(transCmd[1].region).toBe('BRL');
      expect(transCmd[1].products[0]).toEqual({
        name: 'Triblend Android T-Shirt',
        id: 'Test Enhanced Ecommerce',
        price: '15.25',
        category: 'Apparel',
        quantity: 1,
        dimension2: 'Clearance',
        metric2: 1,
        sku: '12345'
      });

      expect(sendCmd[0]).toBe('ecommerce:send');

      done();

    });

    it ('should track an enhanced ecommerce transaction', function(done) {

      analytics.settings.ga.enhancedEcommerce = true;
      analytics.transactionTrack({
        'id': 'Test Enhanced Ecommerce',                         // Transaction ID. Required for purchases and refunds.
        'affiliation': 'Online Store',          // Enhanced Ecommerce only
        'revenue': '35.43',                     // Total transaction value (incl. tax and shipping)
        'tax':'4.90',
        'shipping': '5.99',
        'coupon': 'SUMMER_SALE',                // Enhanced Ecommerce Only
        'dimension10': 'Card ID #1234',          // Hit, Session, or User-level Custom Dimension(s)
        'metric1': 1,                           // Custom Metric(s)
        'currencyCode': 'BRL',
        'region': 'BRL', 
        'products': [{                            // List of productFieldObjects.
          'name': 'Triblend Android T-Shirt',     // Name or ID is required.
          'id': '12345',                          // Equivalent to product SKU
          'price': '15.25',
          'brand': 'Google',                      // Enhanced Ecommerce only
          'category': 'Apparel',    
          'variant': 'Gray',                      // Enhanced Ecommerce only
          'quantity': 1,
          'coupon': 'PRODUCT_COUPON',                           // Enhanced Ecommerce only.
          'dimension2': 'Clearance',              // Product-level Custom Dimension
          'metric2': 1                            // Product-level Custom Metric
         }   
       ]   
      }); 

      var requireCmd = window.ga.q[2];
      var setActionCmd = window.ga.q[3];
      var addProdCmd = window.ga.q[4];
      var sendCmd = window.ga.q[6];

      expect(requireCmd[0]).toBe('require');
      expect(requireCmd[1]).toBe('ec');

      expect(setActionCmd[0]).toBe('ec:setAction');
      expect(setActionCmd[1]).toBe('purchase');
      expect(setActionCmd[2].id).toBe('Test Enhanced Ecommerce');
      expect(setActionCmd[2].affiliation).toBe('Online Store');
      expect(setActionCmd[2].revenue).toBe('35.43');
      expect(setActionCmd[2].tax).toBe('4.90');
      expect(setActionCmd[2].shipping).toBe('5.99');
      expect(setActionCmd[2].coupon).toBe('SUMMER_SALE');
      expect(setActionCmd[2].dimension10).toBe('Card ID #1234');
      expect(setActionCmd[2].metric1).toEqual(1);
      expect(setActionCmd[2].currencyCode).toBe('BRL');
      expect(setActionCmd[2].products[0]).toEqual({
        name: 'Triblend Android T-Shirt',
        id: '12345',
        price: '15.25',
        brand: 'Google',
        category: 'Apparel',
        variant: 'Gray',
        quantity: 1,
        coupon: 'PRODUCT_COUPON',
        dimension2: 'Clearance',
        metric2: 1,
        sku: '12345'
      });
      done();

    });

    it ('should track a timing', function(done) {

      analytics.userTimings({
        timingCategory: 'foo',
        timingVar: 'bar',
        timingValue: 1,
        timingLabel: 'biz'
      });

      var cmd = window.ga.q.pop();
     
      expect(cmd[0]).toBe('send');
      expect(cmd[1]).toEqual({
        hitType: 'timing',
        timingCategory: 'foo',
        timingVar: 'bar',
        timingValue: 1,
        timingLabel: 'biz',
        page: '/abc',
        optSampleRate: undefined
      });

      done();

    });

  });

  describe('classic analytics', function() {

    /*
     * Mocks our $window w/ Classic Analytics installed
     */
    beforeEach(module(function($provide) {

      var windowMock = {
        _gaq: [],
        location: {
          hash: ''
        }
      }; 

      $provide.value('$window', windowMock);

    }));
    beforeEach(module('angulartics'));
    beforeEach(module('angulartics.google.analytics'));

    beforeEach(inject(function(_$analytics_, _$window_, _$location_, _$rootScope_) {

      analytics = _$analytics_;
      window = _$window_;
      location = _$location_;
      rootScope = _$rootScope_;

      location.path('/abc');
      rootScope.$emit('$routeChangeSuccess');
      rootScope.$apply();

    }));

    /*
     * Tests auto-pageview functionality
     */
    it ('should track a pageview', function(done) {

      var cmd = window._gaq.pop();
      expect(cmd[0]).toEqual('_trackPageview');
      expect(cmd[1]).toEqual('/abc');

      done();

    });

    /*
     * Tests pageview functionality
     */
    it ('should track a pageview', function(done) {

      analytics.pageTrack('/efg');

      var cmd = window._gaq.pop();

      expect(cmd[0]).toEqual('_trackPageview');
      expect(cmd[1]).toEqual('/efg');

      done();

    });

    it ('should track an event', function(done) {

      analytics.eventTrack('foo', {
        category: 'bar',
        label: 'baz',
        value: 1,
        nonInteraction: true
      });

      var cmd = window._gaq.pop();

      expect(cmd[0]).toEqual('_trackEvent');
      expect(cmd[1]).toEqual('bar');
      expect(cmd[2]).toEqual('foo');
      expect(cmd[3]).toEqual('baz');
      expect(cmd[4]).toEqual(1);
      expect(cmd[5]).toEqual(true);

      done();

    });

		it ('should track an exception', function(done) {

			function foo() {

				var err = 'Bar';

				throw new Error(err);

			}

			try {

				foo();

			} catch(e) {

				analytics.exceptionTrack(e);

			}

			var cmd = window._gaq.pop();

			expect(cmd[0]).toBe('_trackEvent');
			expect(cmd[1]).toBe('Exceptions');
			expect(cmd[2]).toBe('Error: Bar');
			// Just checking the length of the error stack string rather than pasting it here
			expect(cmd[3] && cmd[3].length > 0).toBe(true);
			expect(cmd[5]).toBe(true);
	
			done();

		});

    it ('should track an ecommerce transaction', function(done) {

      analytics.transactionTrack({
        'id': 'Test Enhanced Ecommerce',        // Transaction ID. Required for purchases and refunds.
        'revenue': '35.43',                     // Total transaction value (incl. tax and shipping)
        'tax':'4.90',
        'shipping': '5.99',
        'dimension10': 'Card ID #1234',         // Hit, Session, or User-level Custom Dimension(s)
        'metric1': 1,                           // Custom Metric(s)
        'currencyCode': 'BRL',
        'region': 'BRL', 
        'products': [{                            // List of productFieldObjects.
          'name': 'Triblend Android T-Shirt',     // Name or ID is required.
          'id': '12345',                          // Equivalent to product SKU
          'price': '15.25',
          'quantity': 1,
          'dimension2': 'Clearance',              // Product-level Custom Dimension
          'metric2': 1                            // Product-level Custom Metric
         }   
       ]   
      }); 

      var transCmd = window._gaq[2];
      var itemCmd = window._gaq[3];
      var currCmd = window._gaq[4];
      var trackCmd = window._gaq[5];
    
      expect(transCmd[0]).toBe('_addTrans');
      expect(transCmd[1]).toBe('Test Enhanced Ecommerce');
      expect(transCmd[3]).toBe('35.43');
      expect(transCmd[4]).toBe('4.90');
      expect(transCmd[5]).toBe('5.99');

      expect(itemCmd[0]).toBe('_addItem');
      expect(itemCmd[1]).toBe('Test Enhanced Ecommerce');
      expect(itemCmd[2]).toBe('12345');
      expect(itemCmd[3]).toBe('Triblend Android T-Shirt');
      expect(itemCmd[5]).toBe('15.25');
      expect(itemCmd[6]).toEqual(1);

      expect(currCmd[0]).toBe('_set');
      expect(currCmd[1]).toBe('currencyCode');
      expect(currCmd[2]).toBe('BRL');

      expect(trackCmd[0]).toBe('_trackTrans');

      done();

    });

    it ('should track a timing', function(done) {

      analytics.userTimings({
        timingCategory: 'foo',
        timingVar: 'bar',
        timingValue: 1,
        timingLabel: 'biz',
        optSampleRate: 100
      });

      var cmd = window._gaq.pop();

      expect(cmd[0]).toBe('_trackTiming');
      expect(cmd[1]).toBe('foo');
      expect(cmd[2]).toBe('bar');
      expect(cmd[3]).toEqual(1);
      expect(cmd[4]).toBe('biz');
      expect(cmd[5]).toEqual(100);

      done();

    });

  });

  describe('configuration', function() {

    /*
     * Mocks our $window w/ Universal Analytics installed
     */
    beforeEach(module(function($provide) {

      var windowMock = {
        GoogleAnalyticsObject: 'ga',
        location: {
          hash: ''
        }
      }; 

      windowMock.ga = function(){(windowMock.ga.q=windowMock.ga.q||[]).push(arguments)};

      $provide.value('$window', windowMock);

    }));
		
    beforeEach(module('angulartics'));
    beforeEach(module('angulartics.google.analytics'));
		beforeEach(module(function(_$analyticsProvider_) {

			_$analyticsProvider_.settings.pageTracking.autoTrackFirstPage = false;

		}));
    beforeEach(inject(function(_$analytics_, _$window_) {

      analytics = _$analytics_;
      window = _$window_;

    }));

		describe('multiple accounts', function() {

			beforeEach(function() {

				analytics.settings.ga.additionalAccountNames = ['foo', 'bar'];

			});

			it ('should fire a pageview to both accounts', function(done) {

				analytics.pageTrack('/foo');

				expect(window.ga.q.length).toEqual(3);
				expect(window.ga.q[0][0]).toBe('send');
				expect(window.ga.q[1][0]).toBe('foo.send');
				expect(window.ga.q[2][0]).toBe('bar.send');

				done();

			});

			it ('should fire an event to only one account', function(done) {

				analytics.settings.ga.additionalAccountHitTypes.event = false;

				analytics.eventTrack('foo');

				expect(window.ga.q.length).toEqual(1);

				done();

			});

		});

		it ('should set the user ID on all hits', function(done) {

			analytics.settings.ga.userId = 'abc';

			analytics.pageTrack('/foo');

			expect(window.ga.q.pop()[1].userId).toBe('abc');

			done();

		});

		it('should not fire a pageview', function(done) {

			analytics.settings.ga.disablePageTracking = true;

			analytics.pageTrack('/foo');

			expect(window.ga.q).toBe(undefined);

			done();

		});

		it('should not fire an event', function(done) {

			analytics.settings.ga.disableEventTracking = true;

			analytics.eventTrack('foo');

			expect(window.ga.q).toBe(undefined);

			done();

		});

		it('should use the useBeacon setting', function(done) {

			var transportSetting = 'beacon';

			analytics.settings.ga.transport = transportSetting;
			analytics.pageTrack('/foo');

			expect(window.ga.q[0][1].transport).toBe(transportSetting);

			done();

		});

  });

});
