var test = require('tape');
var dropFeatures = require('../lib/drop-features');
var fs = require('fs');
var path = require('path');
var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var zlib = require('zlib');

var fixture = fs.readFileSync(path.resolve(__dirname, 'fixtures', 'rectangle-1.0.0.pbf.gz'));

test('[drop features] no features dropped', function(assert) {
  var bounds = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [ -86.484375, 35.460669951495305 ],
          [ -86.484375, 36.4566360115962 ],
          [ -84.990234375, 36.4566360115962 ],
          [ -84.990234375, 35.460669951495305 ],
          [ -86.484375, 35.460669951495305 ]
        ]
      ]
    }
  };

  var clipper = dropFeatures(bounds);

  clipper({ z: 1, x: 0, y: 0, buffer: fixture }, function(err, data) {
    if (err) return assert.end(err);
    zlib.gunzip(data.buffer, function(err, data) {
      if (err) return assert.end(err);
      var vtile = new VectorTile(new Pbf(data));
      assert.ok(vtile.layers.geojsonLayer, 'has layer');
      assert.equal(vtile.layers.geojsonLayer.length, 5, 'has all features');

      var collection = { type: 'FeatureCollection', features: [] };
      for (var i = 0; i < vtile.layers.geojsonLayer.length; i++) {
        collection.features.push(vtile.layers.geojsonLayer.feature(i).toGeoJSON(0, 0, 1));
      }

      var expected = require('./fixtures/rectangle-1.0.0.json');
      assert.deepEqual(collection, expected, 'round-tripped data correctly');

      assert.end();
    });
  });
});

test('[drop features] one feature dropped', function(assert) {
  var bounds = {
    type: 'Feature',
    properties: {
    },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [ -73.861083984375, 48.801436476249386 ],
          [ -73.42987060546874, 48.3361690221153 ],
          [ -73.4161376953125, 48.783342285295475 ],
          [ -73.861083984375, 48.801436476249386 ]
        ]
      ]
    }
  };

  var clipper = dropFeatures(bounds);

  clipper({ z: 1, x: 0, y: 0, buffer: fixture }, function(err, data) {
    if (err) return assert.end(err);
    zlib.gunzip(data.buffer, function(err, data) {
      if (err) return assert.end(err);
      var vtile = new VectorTile(new Pbf(data));
      assert.ok(vtile.layers.geojsonLayer, 'has layer');
      assert.equal(vtile.layers.geojsonLayer.length, 4, 'dropped 1 feature');

      var collection = { type: 'FeatureCollection', features: [] };
      for (var i = 0; i < vtile.layers.geojsonLayer.length; i++) {
        collection.features.push(vtile.layers.geojsonLayer.feature(i).toGeoJSON(0, 0, 1));
      }

      var expected = require('./fixtures/rectangle-1.0.0-dropped.json');
      assert.deepEqual(collection, expected, 'round-tripped data correctly');

      assert.end();
    });
  });
});
