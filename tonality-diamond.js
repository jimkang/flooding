function range(start, len, step = 1) {
  var a = [];
  for (let i = start; a.length < len; i += step) {
    a.push(i);
  }
  return a;
}

function fitToOctave(n) {
  // We're allowing the octave, even though the official tonality diamond doesn't.
  if (n > 2.0) {
    return fitToOctave(n / 2);
  }
  if (n < 1.0) {
    return fitToOctave(n * 2);
  }
  return n;
}

function compareAsc(a, b) {
  if (+a < +b) {
    return -1;
  }
  return 1;
}

function compareDesc(a, b) {
  if (+a < +b) {
    return 1;
  }
  return -1;
}

export function getTonalityDiamond({ diamondLimit }) {
  const factorCount = ~~(diamondLimit / 2 + 1);

  var oddFactors = range(1, factorCount, 2).map(fitToOctave).sort(compareAsc);

  var reciprocalFactors = [1].concat(
    range(3, factorCount - 1, 2)
      .map((n) => 1 / n)
      .map(fitToOctave)
      .sort(compareDesc)
  );

  console.log('oddFactors', oddFactors);
  console.log('reciprocalFactors', reciprocalFactors);

  var diamondTable = [oddFactors];

  for (let rowIndex = 1; rowIndex < oddFactors.length; ++rowIndex) {
    let row = [reciprocalFactors[rowIndex]];
    for (let colIndex = 1; colIndex < reciprocalFactors.length; ++colIndex) {
      row.push(fitToOctave(oddFactors[colIndex] * reciprocalFactors[rowIndex]));
    }
    diamondTable.push(row);
  }

  console.table(diamondTable);

  // Is it a mistake to get rid of redundancies?
  var diamondRatioSet = new Set();

  for (let row = 0; row < diamondTable.length; ++row) {
    for (let col = 0; col < diamondTable[row].length; ++col) {
      diamondRatioSet.add(diamondTable[row][col]);
    }
  }

  var diamondRatios = [...diamondRatioSet.values()];
  console.log(diamondRatios);
  return diamondRatios;
}

//console.log(tonalityDiamondPitches);
