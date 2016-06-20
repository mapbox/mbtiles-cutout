#!/usr/bin/env node

var minzoom = 4;

module.exports = {};
module.exports.parents = parents;
module.exports.buffered = buffered;

// For parent tiles, buffer only the 3 tiles around each quadrant corner.
// This assumes no layer buffer is > 128 (half the tile extent).
// Example for nw corner:
//
// +-------+-------+........
// |       |       |       .
// |       |       |       .
// |       |       |       .
// +-------+---+---+       .
// |       |  x|   |       .
// |       +---+---+ <--------- nw,ne,sw,se quadrants of parent tile
// |       |   |   |       .    if feature is in nw child, only the
// +-------+---+---+       .    3 adjacent corner parents need to be
// .                       .    considered.
// .                       .
// .                       .
// .........................
//
function parents(zxy) {
    var expire = [];

    if (zxy[0] <= minzoom) return expire;

    var pxy = [zxy[0] - 1, Math.floor(zxy[1]/2), Math.floor(zxy[2]/2)];
    var clip = makeClipper(pxy[0]);
    expire.push(pxy[0] + '/' + clip(pxy[1] + 0) + '/' + clip(pxy[2] + 0));
    // nw corner
    if (zxy[1]%2 === 0 && zxy[2]%2 === 0) {
        expire.push(pxy[0] + '/' + clip(pxy[1] - 1) + '/' + clip(pxy[2] - 1));
        expire.push(pxy[0] + '/' + clip(pxy[1] - 1) + '/' + clip(pxy[2] - 0));
        expire.push(pxy[0] + '/' + clip(pxy[1] - 0) + '/' + clip(pxy[2] - 1));
    // ne corner
    } else if (zxy[1]%2 === 1 && zxy[2]%2 === 0) {
        expire.push(pxy[0] + '/' + clip(pxy[1] + 1) + '/' + clip(pxy[2] - 1));
        expire.push(pxy[0] + '/' + clip(pxy[1] + 1) + '/' + clip(pxy[2] - 0));
        expire.push(pxy[0] + '/' + clip(pxy[1] + 0) + '/' + clip(pxy[2] - 1));
    // sw corner
    } else if (zxy[1]%2 === 0 && zxy[2]%2 === 1) {
        expire.push(pxy[0] + '/' + clip(pxy[1] - 1) + '/' + clip(pxy[2] + 1));
        expire.push(pxy[0] + '/' + clip(pxy[1] - 1) + '/' + clip(pxy[2] + 0));
        expire.push(pxy[0] + '/' + clip(pxy[1] - 0) + '/' + clip(pxy[2] + 1));
    // se corner
    } else if (zxy[1]%2 === 1 && zxy[2]%2 === 1) {
        expire.push(pxy[0] + '/' + clip(pxy[1] + 1) + '/' + clip(pxy[2] + 1));
        expire.push(pxy[0] + '/' + clip(pxy[1] + 1) + '/' + clip(pxy[2] + 0));
        expire.push(pxy[0] + '/' + clip(pxy[1] + 0) + '/' + clip(pxy[2] + 1));
    }
    expire = expire.concat(parents(pxy));
    return expire;
}

function makeClipper(z) {
    var m = Math.pow(2, z) - 1;
    return function(num) {
        return Math.max(0, Math.min(m, num));
    };
}

// At maxzoom, full 1-tile buffer around all sizes.
function buffered(zxy) {
    var clip = makeClipper(zxy[0]);
    return [
        zxy[0] + '/' + clip(zxy[1] - 1) + '/' + clip(zxy[2] - 1),
        zxy[0] + '/' + clip(zxy[1] - 1) + '/' + clip(zxy[2] + 0),
        zxy[0] + '/' + clip(zxy[1] - 1) + '/' + clip(zxy[2] + 1),
        zxy[0] + '/' + clip(zxy[1] + 0) + '/' + clip(zxy[2] - 1),
        zxy[0] + '/' + clip(zxy[1] + 0) + '/' + clip(zxy[2] + 0),
        zxy[0] + '/' + clip(zxy[1] + 0) + '/' + clip(zxy[2] + 1),
        zxy[0] + '/' + clip(zxy[1] + 1) + '/' + clip(zxy[2] - 1),
        zxy[0] + '/' + clip(zxy[1] + 1) + '/' + clip(zxy[2] + 0),
        zxy[0] + '/' + clip(zxy[1] + 1) + '/' + clip(zxy[2] + 1)
    ];
}

if (!module.parent) process.stdin
    .pipe(require('split')())
    .on('data', function(line) {
        if (!line) return;

        var zxy = line.split('/');
        zxy[0] = parseInt(zxy[0], 10);
        zxy[1] = parseInt(zxy[1], 10);
        zxy[2] = parseInt(zxy[2], 10);

        var expire = buffered(zxy).concat(parents(zxy));
        for (var i = 0; i < expire.length; i++) {
            console.log(expire[i]);
        }
    });
