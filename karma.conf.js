module.exports = function(config) {
  'use strict';

  config.set({

    basePath: './',

    frameworks: ["jasmine"],

    files: [
      'components/angular/angular.js',
      'components/angular-route/angular-route.js',
      'components/angulartics/src/angulartics.js',
      'lib/angulartics-ga.js',
      'components/angular-mocks/angular-mocks.js',
      'test/**/*.js'
    ],

    exclude: [
      'src/index.js'
    ],

    autoWatch: true,

    browsers: ['PhantomJS']

  });
};
