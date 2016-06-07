#!/usr/bin/env node

var cutter = require('..');

var options = require( 'yargs' )
  .usage('Usage: $0 -m <mbtiles-file> -c <shape-to-cut> -b <shape-to-blank> --cut-min-zoom N --cut-max-zoom N --blank-min-zoom N --blank-max-zoom M')
  .option('m', {
    alias: 'mbtiles-file',
    demand: true,
    describe: 'Path to mbtiles-file to cut',
    type: 'string'
  })
  .option('t', {
    alias: 'tms-style',
    demand: false,
    describe: 'Whether mbtiles tileset is in tms style',
    type: 'boolean',
    default: 'true'
  })
  .option('c', {
    alias: 'shape-to-cut',
    demand: false,
    describe: 'Path to geojson file shape to cut from mbtiles',
    type: 'string'
  })
  .option('b', {
    alias: 'shape-to-blank',
    demand: false,
    describe: 'Path to geojson file shape to blank from mbtiles',
    type: 'string'
  })
  .option('cut-min-zoom', {
    demand: false,
    describe: 'Min zoom of shape to cut',
    type: 'number'
  })
  .option('cut-max-zoom', {
    demand: false,
    describe: 'max zoom of shape to cut',
    type: 'number'
  })
  .option('blank-min-zoom', {
    demand: false,
    describe: 'min zoom of shape to blank',
    type: 'string'
  })
  .option('blank-max-zoom', {
    demand: false,
    describe: 'max zoom of shape to blank',
    type: 'string'
  })
  .help('?')
  .alias('?', 'help')
  .argv;

cutter.cut(options);
