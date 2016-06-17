var parallel = require('parallel-stream');
var dropFeatures = require('./drop-features');
var Tile = require('tilelive/lib/stream-util').Tile;

/**
 * Create a transform stream suitable for use in a tilelive.copy operation which
 * drops features from vector tiles that intersect some polygon.
 *
 * @param {object} polygon - a GeoJSON Polygon or MultiPolygon feature
 * @param {object} options - stream options
 * @param {number} options.concurrency - number of concurrent tile manipulations
 * to perform
 * @returns {object} transform - a transform stream
 */
module.exports = function(polygon, options) {
  options = options || {};
  options.objectMode = true;

  var clipper = dropFeatures(polygon);

  return parallel.transform(function(oldTile, enc, callback) {
    clipper(oldTile, function(err, newTile) {
      if (err) return callback(err);
      callback(null, new Tile(newTile.z, newTile.x, newTile.y, newTile.buffer));
    });
  }, options);
};
