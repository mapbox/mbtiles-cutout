var fs = require('fs');
var path = require('path');
var tape = require('tape');
var cutter = require('..');

tape('cutOrBlank unit tests', function(t) {

  var northAndSouthAmerica = JSON.parse(fs.readFileSync(path.join(__dirname, './fixtures/north-and-south-america.json')));

  t.equal(
    cutter.cutOrBlank([12, 1171, 1566], northAndSouthAmerica, 0, 13),
    true,
    'Washington, DC inside section of North and South America'
  );

  t.equal(
    cutter.cutOrBlank([12, 1171, 1566], northAndSouthAmerica, 0, 10),
    false,
    'Washington, DC inside section of North and South America but zoom too high'
  );

  t.equal(
    cutter.cutOrBlank([12, 1171, 1566], northAndSouthAmerica, 13, 15),
    false,
    'Washington, DC inside section of North and South America but zoom too low'
  );

  t.equal(
    cutter.cutOrBlank([14, 9093, 6123], northAndSouthAmerica, 0, 13),
    false,
    'Tirana outside section of North and South America'
  );

  t.equal(
    cutter.cutOrBlank([13, 2385, 4373], northAndSouthAmerica, 0, 13),
    true,
    'Huancayo inside section of North and South America'
  );

  t.equal(
    cutter.cutOrBlank([12, 4036, 2499], northAndSouthAmerica, 0, 13),
    false,
    'Auckland outside section of North and South America'
  );

  t.end();

});
