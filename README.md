# mbtiles-cutout

[![Build Status](https://travis-ci.org/mapbox/mbtiles-cutout.svg?branch=master)](https://travis-ci.org/mapbox/mbtiles-cutout)

Command line tool to delete, or fill with blank tiles, any tiles within a defined polygon.

## Install

`npm install && npm link`

## Synopsis

`mbtiles-cutout -m foo.mbtiles -c us.json --cut-min-zoom 0 --cut-max-zoom 12`

where:

- us.json is an array of longitude,latitude arrays
- foo.mbtiles is an mbtiles file
- --cut-min-zoom and --cut-max-zoom specify the zoom range within which the tile should be in order to be deleted
