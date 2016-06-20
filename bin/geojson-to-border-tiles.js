// Given a polygon or multipolygon, find all the tiles that intersect the border
// at zoom levels 0 through 14

var exp = require('../support/expander');
var fs = require('fs');
var tc = require('tile-cover');
var _ = require('underscore');

// Provide output filename as argument
var featurePath = process.argv[2];
var output = process.argv[3];

var line;
var feature = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
if (feature.geometry.type === 'Polygon') {
  line = polygonToLinestring(feature);
} else if (feature.geometry.type === 'MultiPolygon') {
  line = multiPolygonToMultiLinestring(feature);
} else {
  throw new Error('Invalid input geometry type');
}

var tiles = tc.tiles(line.geometry, { min_zoom: 14, max_zoom: 14 });
var unique = deduplicate(tiles);
var allZooms = addLowZooms(line, unique);
fs.writeFileSync(output, allZooms);

function multiPolygonToMultiLinestring (multipolygon) {
  var coordinates = [];
  for (var i = 0; i < multipolygon.geometry.coordinates.length; i++) {
    coordinates.push(multipolygon.geometry.coordinates[i][0]);
  }
  var multilinestring = {"type":"Feature","properties":{},"geometry":{"type":"MultiLineString","coordinates":coordinates}};
  return multilinestring;
}

function polygonToLinestring (polygon) {
  var coordinates = polygon.geometry.coordinates[0];
  var linestring = {"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":coordinates}};
  return linestring;
}

function deduplicate (array) {
  var unique = {};
  for (var i = 0; i < tiles.length; i++) {
    unique = expander(tiles[i], unique);
  };
  
  var result = getString(unique);
  return result;
}

function expander (array, object) {
  var zxy = [];
  var results = [];
  zxy[0] = array[2];
  zxy[1] = array[0];
  zxy[2] = array[1];

  var buffered = exp.buffered(zxy);
  var parents = exp.parents(zxy);
  var result = buffered.concat(parents);

  for (var i = 0; i < result.length; i++) {
    if (!object.hasOwnProperty(result[i])) {
      object[result[i]] = true;
    }
  }
  return object;
};

function getString (object) {
  var keys = _.keys(object);
  keys.sort();
  var result = keys.join('\n');
  return result;
};

function addLowZooms (line, string) {
  var result = '';
  for (var i = 0; i < 4; i++) {
    var tiles = tc.tiles(line.geometry, { min_zoom: i, max_zoom: i });
    for (var j = 0; j < tiles.length; j++) {
      var zxy = [ tiles[j][2], tiles[j][0], tiles[j][1] ];
      result += zxy.join('/') + ('\n');      
    }
  }
  return string + '\n' + result;
}