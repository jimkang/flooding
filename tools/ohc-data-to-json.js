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
var rows = lines.map(parseLine).flat();
const minDelta = rows.reduce(
  (min, row) => (row.heatDelta < min ? row.heatDelta : min),
  0
);
rows.forEach(normalize);

// console.log('min', minDelta);
fs.writeFileSync(
  path.join(outputDirPath, basename + '.json'),
  JSON.stringify(rows, null, 2),
  { encoding: 'utf8' }
);

// This will sometimes return two objects.
function parseLine(line) {
  var values = line.split(',');
  let [year, monthPart] = values[0].split('-');
  year = +year;
  // JS months are 0-based. NOAA months are 1-based.
  const month = +monthPart - 1;
  var date = new Date(year, month);
  const heatDelta = +values[1];
  // The month is the end of the three-month period. So, 2 (March — Jan is 0 and Feb. is 1) is the first period of the year.
  const startOfDecade = year % 10 === 0 && month === 2;

  if (startOfDecade) {
    return [
      { date, year, month, heatDelta, startOfDecade },
      { date, year, month, heatDelta },
    ];
  }

  return { date, year, month, heatDelta };
}

function normalize(row) {
  row.value = row.heatDelta - minDelta;
}
