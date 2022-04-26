import { diamondLimit } from './consts';
const diamondSideLength = Math.ceil(diamondLimit/2);

var diamondRatios = [];

for (let row = 0; row < diamondSideLength; ++row) {
  const denominator = diamondLimit - row;
  for (let col = 0; col < diamondSideLength; ++col) {
    const numerator = diamondLimit - col;
    diamondRatios.push({ numerator, denominator });
  }
}

diamondRatios = diamondRatios.map(factorDown);
diamondRatios.sort((a, b) => a.denominator - b.denominator);

// Dedupe.
for (let i = diamondRatios.length - 1; i > 0; --i) {
  let ratio = diamondRatios[i];
  let prevRatio = diamondRatios[i - 1];
  if (ratio.numerator === prevRatio.numerator && ratio.denominator === prevRatio.denominator) {
    diamondRatios.splice(i, 1);
  }
}

console.log(diamondRatios);

export var tonalityDiamondPitches = [1, 2].concat(diamondRatios.slice(1).map(({ numerator, denominator }) => numerator/denominator));

console.log(tonalityDiamondPitches);

function factorDown({ numerator, denominator }) {
  var commonFactor = findCommonFactor(numerator, denominator);
  if (commonFactor) {
    return { numerator: numerator/commonFactor, denominator: denominator/commonFactor };
  }
  return { numerator, denominator };
}

// Assumes whole numbers for a and b.
function findCommonFactor(a, b) {
  for (let factor = a; factor > 0; --factor) {
    if (a/factor % 1 === 0 && b/factor % 1 === 0) {
      return factor;
    }
  }
}

