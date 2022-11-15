#!/usr/bin/env node

var fs = require('fs');
var path = require('path');

/* global process */

if (process.argv.length < 4) {
  console.error(
    'Usage: node tools/psmsl-tide-gauge-data-to-json.js <relative path to PSMSL file> <output dir path>'
  );
  process.exit(1);
}

const inputPath = process.argv[2];
const outputDirPath = process.argv[3];
const basename = path.basename(inputPath, '.rlrdata');
const contents = fs.readFileSync(inputPath, { encoding: 'utf8' });
var lines = contents.trim().split('\n');
var rows = lines.map(parseLine);
fs.writeFileSync(path.join(outputDirPath, basename + '.json'), JSON.stringify(rows, null, 2), { encoding: 'utf8' });

function parseLine(line, lines, i) {
  var values = line.split(';');
  const [year, monthPart] = values[0].split('.');
  const month = +monthPart/10000*12;
  var date = new Date(year, month);
  var meanSeaLevelDeltaMM = +values[1];
  if (meanSeaLevelDeltaMM === -99999) {
    // There's no data for this month, so guess.
    if (i > 0) {
      meanSeaLevelDeltaMM = rows[i - 1].meanSeaLevelDeltaMM;
    } else {
      meanSeaLevelDeltaMM = 0;
    }
  }
  return { date, year, month, meanSeaLevelDeltaMM };
}

