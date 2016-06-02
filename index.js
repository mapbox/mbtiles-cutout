var fs = require('fs');
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var d3 = require('d3-queue');
var cover = require('tile-cover');

var cutout = module.exports;
var blankTileData = new Buffer('H4sIAAAAAAAAA5My4WItTyxJLRKS4mAQYmJgkGBWEuD8z9jgJMXw37nBhYGhwYVfii2/ODc+M0WJSYFBo0GhghEAY2QLiTYAAAA=', 'base64');

cutout.cut = function(options) {

  var tilesToCut;
  var tilesToBlank;
  var database;
  var q = d3.queue(1);
  var dbpath = path.join(process.cwd(), options.mbtilesFile);
  var toCut = options.shapeToCut ? JSON.parse(fs.readFileSync(options.shapeToCut)) : null;
  var toBlank = options.shapeToBlank ? JSON.parse(fs.readFileSync(options.shapeToBlank)) : null;

  if (toCut) {
    var cutLimits = {
      min_zoom: options.cutMinZoom,
      max_zoom: options.cutMaxZoom
    };

    tilesToCut = cover.tiles(toCut, cutLimits);
  }

  if (toBlank) {
    var blankLimits = {
      min_zoom: options.blankMinZoom,
      max_zoom: options.blankMaxZoom
    };

    tilesToBlank = cover.tiles(toBlank, blankLimits);
  }

  open(dbpath, function(err, db) {

    tilesToCut.forEach(function(coords) {
      q.defer(deleteTile, db, coords);
    });

    tilesToBlank.forEach(function(coords) {
      q.defer(blankTile, db, coords);
    });

    q.awaitAll(function(err) {
      if (err) throw err;
      // XXX close the DB
    });

  });

};

function open(database, cb) {
  var db = new sqlite3.Database(database, function(err) {
    if (err) return cb(err);
    else cb(null, db);
  });
}

function deleteTile(database, coords, cb) {

  var column = coords[1];
  var row = coords[0];
  var zoom = coords[2];

  database.get('SELECT tile_id FROM map WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?',
    zoom, column, row, function(err, res) {
    //4, 15, 15, function(err, res) {
    if (err) return cb(err);
    if (!res) return cb(null);
    var tile_id = res.tile_id;
    database.run('DELETE FROM images WHERE tile_id = ?', tile_id, function(err) {
      if (err) return cb(err);
      database.run('DELETE FROM map WHERE tile_id = ?', tile_id, function(err) {
        if (err) return cb(err);
        cb();
      });
    });
  });

}

function blankTile(database, coords, cb) {

  var column = coords[1];
  var row = coords[0];
  var zoom = coords[2];

  database.get('SELECT tile_id FROM map WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?',
    zoom, column, row, function(err, res) {
    if (err) return cb(err);
    if (!res) return cb(null);
    var tile_id = res.tile_id;
    database.run('UPDATE images SET tile_data = ? WHERE tile_id = ?',
      blankTileData, tile_id, function(err) {
        cb(err);
      });
  });

}
