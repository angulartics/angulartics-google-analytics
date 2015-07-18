## angulartics-google-analytics

[![Join the chat at https://gitter.im/angulartics/angulartics-google-analytics](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/angulartics/angulartics-google-analytics?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![NPM version][npm-image]][npm-url] [![NPM downloads][npm-downloads-image]][npm-downloads-url] [![Bower version][bower-image]][bower-url] [![Dependencies status][dep-status-image]][dep-status-url] [![MIT license][license-image]][license-url]

Google Analytics plugin for [Angulartics](http://github.com/luisfarzati/angulartics).

## Install

First make sure you've read installation and setup instructions for [Angulartics](https://github.com/luisfarzati/angulartics#install).

Then you can install this package either with `npm` or with `bower`.

### npm

```shell
npm install angulartics-google-analytics
```

Then add `angulartics.google.analytics` as a dependency for your app:

```javascript
require('angulartics')

angular.module('myApp', [
  'angulartics', 
  require('angulartics-google-analytics')
]);
```

> Please note that core Angulartics doesn't export the name yet, but it will once we move it into the new organization.

### bower

```shell
bower install angulartics-google-analytics
```

Add the `<script>` to your `index.html`:

```html
<script src="/bower_components/angulartics-google-analytics/dist/angulartics-google-analytics.min.js"></script>
```

Then add `angulartics.google.analytics` as a dependency for your app:

```javascript
angular.module('myApp', [
  'angulartics', 
  'angulartics.google.analytics'
]);
```

## Changes in the Google Analytics snippet

The snippet code provided by Google Analytics does an automatic pageview hit, but this is already done by Angulartics (unless you disable it) so make sure to delete the tracking line:

```js
      ...
      ga('create', 'UA-XXXXXXXX-X', 'none'); // 'none' while you are working on localhost
      ga('send', 'pageview');  // DELETE THIS LINE!
    </script>
```

Done. Open your app, browse across the different routes and check [the realtime GA dashboard](https://www.google.com/analytics/web/?hl=en#realtime/rt-overview) to see the hits.

## Documentation

Documentation is available on the [Angulartics site](http://luisfarzati.github.io/angulartics).

## Development

```shell
npm run build
```

## License

[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/angulartics-google-analytics.svg
[npm-url]: https://npmjs.org/package/angulartics-google-analytics
[npm-downloads-image]: https://img.shields.io/npm/dm/angulartics-google-analytics.svg
[npm-downloads-url]: https://npmjs.org/package/angulartics-google-analytics
[bower-image]: https://img.shields.io/bower/v/angulartics-google-analytics.svg
[bower-url]: http://bower.io/search/?q=angulartics-google-analytics
[dep-status-image]: https://img.shields.io/david/angulartics/angulartics-google-analytics.svg
[dep-status-url]: https://david-dm.org/angulartics/angulartics-google-analytics
[license-image]: http://img.shields.io/badge/license-MIT-blue.svg
[license-url]: LICENSE
