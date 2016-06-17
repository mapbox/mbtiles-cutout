var test = require('tape');
var tilelive = require('tilelive');
var path = require('path');
var fs = require('fs');
var fixture = path.resolve(__dirname, 'fixtures', 'rectangle-1.0.0.pbf.gz');
var stream = require('stream');
var zlib = require('zlib');
var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var dropStream = require('../lib/drop-feature-stream');

function FakeSource() {}
FakeSource.prototype.getTile = function(z, x, y, callback) {
  fs.readFile(fixture, function(err, data) {
    if (err) return callback(err);
    callback(null, data);
  });
};

function FakeSink() {
  this.tiles = [];
}
FakeSink.prototype.putTile = function(z, x, y, data, callback) {
  this.tiles.push(data);
  setImmediate(callback);
};

function listStream() {
  var list = new stream.Readable();
  var coords = ['1/0/0\n'];
  list._read = function() {
    var data = coords.shift() || null;
    setImmediate(list.push.bind(list), data);
  };
  return list;
}

test('[drop features stream] no drops', function(assert) {
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
  var src = new FakeSource();
  var dst = new FakeSink();
  var list = listStream();
  var drop = dropStream(bounds);

  tilelive.copy(src, dst, {
    type: 'list',
    transform: drop,
    listStream: list
  }, function(err) {
    if (err) return assert.end(err);
    assert.equal(dst.tiles.length, 1, 'copied one tile');
    zlib.gunzip(dst.tiles[0], function(err, data) {
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

test('[drop features stream] drops a feature', function(assert) {
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
  var src = new FakeSource();
  var dst = new FakeSink();
  var list = listStream();
  var drop = dropStream(bounds);

  tilelive.copy(src, dst, {
    type: 'list',
    transform: drop,
    listStream: list
  }, function(err) {
    if (err) return assert.end(err);
    assert.equal(dst.tiles.length, 1, 'copied one tile');
    zlib.gunzip(dst.tiles[0], function(err, data) {
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
