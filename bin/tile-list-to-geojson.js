// Given a list of tiles, generate a list of GeoJSON tile features

var fs = require('fs');
var stream = require('stream');
var convertToGeoJSON = new stream.Transform();
var tilebelt = require('tilebelt').tileToGeoJSON;

// Provide input filename, output filename, and zoom as arguments
var input = process.argv[2];
var output = process.argv[3];
var zoom = Number(process.argv[4]);

var output = fs.createWriteStream(output);
var input = fs.createReadStream(input);
input.on('open', function() {
  input.pipe(convertToGeoJSON).pipe(output);
})

convertToGeoJSON._transform = function (chunk, enc, callback) {
  var result = '';
  var tiles = chunk.toString().split('\n');
  for (var i = 0; i < tiles.length; i++) {
    var zxy = tiles[i].split('/');
    var xyz = [ Number(zxy[1]), Number(zxy[2]), Number(zxy[0]) ];
    var geojson = tilebelt(xyz);
    geojson.properties = {};
    geojson.properties.zoom = xyz[2];
    if (Number(geojson.properties.zoom) === zoom) {
      result += JSON.stringify(geojson) + '\n';
    }
  }
  convertToGeoJSON.push(result);
  callback();
}
