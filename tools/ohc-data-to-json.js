#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

/* global process */

if (process.argv.length < 4) {
  console.error(
    'Usage: node tools/ohc-data-to-json.js <relative path to OHC csv> <output dir path>'
  );
  process.exit(1);
}

const inputPath = process.argv[2];
const outputDirPath = process.argv[3];
const basename = path.basename(inputPath, '.csv');
const contents = fs.readFileSync(inputPath, { encoding: 'utf8' });
var lines = contents.trim().split('\n');
var rows = lines.map(parseLine);
const minDelta = rows.reduce(
  (min, row) => (row.heatDelta < min ? row.heatDelta : min),
  0
);
rows.forEach(normalize);

console.log('min', minDelta);
fs.writeFileSync(
  path.join(outputDirPath, basename + '.json'),
  JSON.stringify(rows, null, 2),
  { encoding: 'utf8' }
);

function parseLine(line) {
  var values = line.split(',');
  const [year, monthPart] = values[0].split('-');
  const month = +monthPart;
  var date = new Date(year, month);
  var heatDelta = +values[1];
  return { date, year, month, heatDelta };
}

function normalize(row) {
  row.heatDeltaNorm = row.heatDelta - minDelta;
}
