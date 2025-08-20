function range(start, len, step = 1) {
  var a = [];
  for (let i = start; a.length < len; i += step) {
    a.push(i);
  }
  return a;
}

function fitToOctave(n) {
  if (n >= 2.0) {
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

  // The reciprocal factors are sorted in descending size, except the 1 at the
  // start, which is necessary to create the diagonal of 1s in the table.
  var reciprocalFactors = range(3, factorCount - 1, 2)
    .map((n) => 1 / n)
    .map(fitToOctave)
    .sort(compareDesc);
  reciprocalFactors = [1].concat(reciprocalFactors);
  console.log('oddFactors', oddFactors);
  console.log('reciprocalFactors', reciprocalFactors);

  var diamondTable = [];

  for (let rowIndex = 0; rowIndex < oddFactors.length; ++rowIndex) {
    let row = [];
    for (let colIndex = 0; colIndex < reciprocalFactors.length; ++colIndex) {
      row.push(fitToOctave(oddFactors[colIndex] * reciprocalFactors[rowIndex]));
    }
    diamondTable.push(row);
  }

  console.table(diamondTable);

  // Get rid of redundancies to avoid a really root-heavy set of pitches
  // that ends up sounding like a foghorn.
  var diamondRatioSet = new Set();

  for (let row = 0; row < diamondTable.length; ++row) {
    for (let col = 0; col < diamondTable[row].length; ++col) {
      diamondRatioSet.add(diamondTable[row][col]);
    }
  }

  var diamondRatios = [...diamondRatioSet.values()];
  // console.log(diamondRatios);
  return diamondRatios;
}

//console.log(tonalityDiamondPitches);
