var fs = require('fs');
var path = require('path');
var sqlite3 = require('sqlite3').verbose();
var d3 = require('d3-queue');
var inside = require('point-in-polygon');
var SM = require('sphericalmercator');

var merc = new SM({
    size: 256
});

var cutout = module.exports;

var blankTileData = new Buffer('H4sIAAAAAAAAA5My4WItTyxJLRKS4mAQYmJgkGBWEuD8z9jgJMXw37nBhYGhwYVfii2/ODc+M0WJSYFBo0GhghEAY2QLiTYAAAA=', 'base64');

cutout.cut = function(options) {

  var dbpath = path.join(process.cwd(), options.mbtilesFile);
  options.toCut = options.shapeToCut ? JSON.parse(fs.readFileSync(options.shapeToCut)) : null;
  options.toBlank = options.shapeToBlank ? JSON.parse(fs.readFileSync(options.shapeToBlank)) : null;

  open(dbpath, function(err, db) {
    if (err) throw err;

    db.get('SELECT count(*) as cnt FROM map', function(err, res) {
      if (err) throw err;
      var rows = res.cnt;

      var q = d3.queue(1);

      for (var i = 0; i < rows; i += 10000) {
        q.defer(batchUpdateRows, db, options, i);
      }

      q.awaitAll(function(err) {
        console.log(err);
      });

    });

  });

};

function open(database, cb) {
  var db = new sqlite3.Database(database, function(err) {
    if (err) return cb(err);
    else cb(null, db);
  });
}

function batchUpdateRows(db, options, i, cb) {
  db.all('SELECT * FROM map WHERE ROWID >= ? AND ROWID < ?', i, i+10000, function(err, res) {
    if (err) return cb(err);

    var q = d3.queue(10);

    res.forEach(function(row) {

      q.defer(function(done) {

        var zxy = [row.zoom_level, row.tile_row, row.tile_column];
        var cut;
        var blank;

        if (options.toCut) {
          cut = cutOrBlank(zxy, options.toCut, options.cutMinZoom, options.cutMaxZoom);
        }

        if (options.toBlank) {
          blank = cutOrBlank(zxy, options.toBlank, options.blankMinZoom, options.blankMaxZoom);
        }

        if (cut || blank) {
          alterTile(db, row.tile_id, cut, blank, function(err) {
            done(err);
          });
        } else {
          done();
        }
      });

    });

    q.awaitAll(function(err) {
      cb(err);
    });

  });
}

function alterTile(db, tile_id, cut, blank, cb) {
    var q = d3.queue();

    if (cut) {
      q.defer(function(done) {
        db.run('DELETE FROM images WHERE tile_id = ?', tile_id, function(err) {
          if (err) return done(err);
          db.run('DELETE FROM map WHERE tile_id = ?', tile_id, function(err) {
            if (err) return done(err);
            cb();
          });
        });
      });
    }

    // Don't allow blanking AND cutting
    if (blank && !cut) {
      q.defer(function(done) {
        db.run('UPDATE images SET tile_data = ? WHERE tile_id = ?', blankTileData, tile_id, function(err) {
          done(err);
        });
      });
    }

    q.awaitAll(function(err) {
      cb(err);
    });
}

function pt(bbox) {
  return [(bbox[0]+bbox[2])/2, (bbox[1]+bbox[3])/2];
}

function cutOrBlank(zxy, polygon, minZoom, maxZoom) {
  var z = zxy[0];
  var x = zxy[1];
  var y = zxy[2];

  if (z >= minZoom && z <= maxZoom) {
    var bbox = merc.bbox(x, y, z);
    var ll = pt(bbox);
    return inside([ll[1], ll[0]], polygon);
  } else {
    return false;
  }

}
