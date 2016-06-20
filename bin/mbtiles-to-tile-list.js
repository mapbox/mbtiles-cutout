// Given an MBTiles file and a polygon or multipolygon feature,
// generate a list of tiles that do not intersect with the multipolygon

var fs = require('fs');
var intersect = require('turf-intersect');
var lineclip = require('lineclip');
var mbtiles = require('mbtiles');
var stream = require('stream');
var tilebelt = require('tilebelt').tileToBBOX;

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
      var zxy = array[i].split('/');
      var xyz = [ Number(zxy[1]), Number(zxy[2]), Number(zxy[0]) ];
      var bbox = tilebelt(xyz);
      var intersections = 0;

      for (var j = 0; j < feature.geometry.coordinates.length; j++) {
        var clipped;
        if (feature.geometry.type === 'Polygon') {
          clipped = lineclip(feature.geometry.coordinates[j], bbox);
        } else if (feature.geometry.type === 'MultiPolygon') {
          clipped = lineclip(feature.geometry.coordinates[j][0], bbox);
        } else {
          throw new Error('Invalid feature geometry type');
        };
        clipped.length !== 0 ? intersections++ : intersections;
      }

      if (intersections === 0) {
        result += array[i] + '\n';
      }

    }
  }
  return result;
}

