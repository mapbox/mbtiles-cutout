var vtpbf = require('vt-pbf');
var VectorTile = require('vector-tile').VectorTile;
var Pbf = require('pbf');
var intersect = require('turf-intersect');
var zlib = require('zlib');

/**
 * Provides a clipper function to drop features from vector tiles.
 *
 * @param {object} polygon - a GeoJSON Polygon or MultiPolygon feature
 * @returns {function} clipper - a function to drop intersecting features from
 * a vector tile.
 * @example
 * var tile = { z: 1, x: 0, y: 0, buffer: <Buffer> };
 * var cutout = {
 *   type: 'Feature',
 *   properties: {
 *   },
 *   geometry: {
 *     type: 'Polygon',
 *     coordinates: [
 *       [
 *         [ -73.861083984375, 48.801436476249386 ],
 *         [ -73.42987060546874, 48.3361690221153 ],
 *         [ -73.4161376953125, 48.783342285295475 ],
 *         [ -73.861083984375, 48.801436476249386 ]
 *       ]
 *     ]
 *   }
 * };
 *
 * var dropFeatures = require('mbtiles-cutout/lib/drop-features');
 * var clipper = dropFeatures(cutout);
 * 
 * clipper(tile, function(err, newTile) {
 *  console.log(newTile); // { z: 1, x: 0, y: 0, buffer: <Buffer> }
 * });
 */
module.exports = function(polygon) {
  /**
   * Drops features from a vector tile
   *
   * @param {object} tile - a vector tile
   * @param {number} tile.z - z coord
   * @param {number} tile.x - x coord
   * @param {number} tile.y - y coord
   * @param {buffer} tile.buffer - gzipped binary vector tile data
   * @param {function} callback - a function to accept the adjusted tile
   */
  return function clipper(tile, callback) {
    zlib.gunzip(tile.buffer, function(err, data) {
      if (err) return callback(err);

      var vtile;

      try {
        vtile = new VectorTile(new Pbf(data));
      } catch(err) {
        return callback(err);
      }

      if (Object.keys(vtile.layers).length === 0) return callback(null, tile.buffer);

      var layers = {};
      for (var name in vtile.layers) {
        var layer = vtile.layers[name];

        layers[name] = new Layer(name, layer.version, layer.extent);

        for (var i = 0; i < layer.length; i++) {
          var feature = layer.feature(i);
          var geojson = feature.toGeoJSON(tile.x, tile.y, tile.z);
          if (!intersect(polygon, geojson)) layers[name].push(feature);
        }

        var buf = vtpbf({ layers: layers });
        zlib.gzip(buf, function(err, compressed) {
          if (err) return callback(err);
          callback(null, { z: tile.z, x: tile.x, y: tile.y, buffer: compressed });
        });
      }
    });
  };
};

function Layer(name, version, extent) {
  this.name = name;
  this.version = version;
  this.extent = extent;
  this._keepers = [];
  this.length = 0;
}

Layer.prototype.feature = function(i) {
  return this._keepers[i];
};

Layer.prototype.push = function(feature) {
  this._keepers.push(feature);
  this.length++;
};
