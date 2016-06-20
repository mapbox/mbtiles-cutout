// Given an MBTiles file and a polygon or multipolygon feature,
// generate a list of tiles that do not intersect with the multipolygon

var fs = require('fs');
var intersect = require('turf-intersect');
var mbtiles = require('mbtiles');
var stream = require('stream');
var tilebelt = require('tilebelt').tileToGeoJSON;

// Provide feature path, intput filename, and output filename as arguments
var featurePath = process.argv[2];
var input = process.argv[3];
var output = process.argv[4];

var file = fs.createWriteStream(output);
new mbtiles(input, function (err, src) {
  if (err) throw err;
  var stream = src.createZXYStream();
  stream.pipe(removeFeatureTiles).pipe(file);
})

var removeFeatureTiles = new stream.Transform();
removeFeatureTiles._transform = function (chunk, enc, callback) {
  var feature = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
  var filtered = tileFormat(chunk, feature);
  removeFeatureTiles.push(filtered);
  callback();
}

function tileFormat (chunk, feature) {
  var result = '';
  var array = chunk.toString().split('\n');
  for (var i = 0; i < array.length; i++) {
    if (array[i] !== '') {
      var intersections = 0;
      var zxy = array[i].split('/');
      var xyz = [ Number(zxy[1]), Number(zxy[2]), Number(zxy[0]) ];
      var geojson = tilebelt(xyz);
      for (var j = 0; j < feature.geometry.coordinates.length; j++) {
        var polygon;
        if (feature.geometry.type === 'Polygon') {
          polygon = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[ feature.geometry.coordinates[j] ]}};
        } else {
          polygon = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":feature.geometry.coordinates[j]}};
        };
        if (intersect(polygon ,geojson) !== undefined) {
          intersections++;
        }
      }
      if (intersections === 0) {
        result += array[i] + '\n';
      }
    }
  }
  return result;
}

