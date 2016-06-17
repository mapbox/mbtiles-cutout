var intersect = require('turf-intersect');
var zlib = require('zlib');
var mapnik = require('mapnik');
mapnik.register_default_input_plugins();

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
        // vtile = new VectorTile(new  Pbf(data));
        vtile = new mapnik.VectorTile(tile.z, tile.x, tile.y);
        vtile.addDataSync(data);
      } catch(err) {
        return callback(err);
      }

      var layers = vtile.names();
      var vts = []; // array of mapnik vector tiles to be composited later
      if (layers.length === 0) return callback(null, tile.buffer);

      // for each layer, get the geojson and loop through each feature and intersect
      // if they do intersect, don't add the feature to a temp geojson
      // once done, add temp geojson to a temp vector tile, add that to an array of vts
      // after the loop, composite all vts into a single, new vt
      for (var l = 0; l < layers.length; l++) {

        var name = layers[l];

        var originalGeoJSON = JSON.parse(vtile.toGeoJSONSync(name));
        console.log(originalGeoJSON.features);
        var tempGeoJSON = {
          "type": "FeatureCollection",
          "features": []
        };

        // for each feature in the original geojson, see if it intersects the polygon
        // if it doesn't, add it to the tempGeoJSON - otherwise consider it removed
        for (var f = 0; f < originalGeoJSON.features.length; f++) {
          var feature = originalGeoJSON.features[f];
          if (!intersect(polygon, feature)) tempGeoJSON.features.push(feature);
        }

        // create a temporary mapnik vt object and add the geojson with the layer name
        tempVT = new mapnik.VectorTile(tile.z, tile.x, tile.y);
        tempVT.addGeoJSON(JSON.stringify(tempGeoJSON), name);
        vts.push(tempVT);
      }

      // now create a final vt with all of the clipped vector tiles
      // we can do this with the first tile in the array
      var finalTile = vts[0];
      vts.shift(); // grab the rest of them
      if (vts.length) finalTile.compositeSync(vts); // composite if there are more

      finalTile.getData(function(err, buffer) {
        if (err) return callback(err);
        zlib.gzip(buffer, function(err, compressed) {
          if (err) return callback(err);
          callback(null, { z: tile.z, x: tile.x, y: tile.y, buffer: compressed });
        });
      });
    });
  };
};

// function Layer(name, version, extent) {
//   this.name = name;
//   this.version = version;
//   this.extent = extent;
//   this._keepers = [];
//   this.length = 0;
// }

// Layer.prototype.feature = function(i) {
//   return this._keepers[i];
// };

// Layer.prototype.push = function(feature) {
//   this._keepers.push(feature);
//   this.length++;
// };
