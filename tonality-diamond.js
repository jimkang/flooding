import { diamondLimit } from './consts';
const diamondSideLength = Math.ceil(diamondLimit/2);

var diamondRatioMap = new Map();

for (let row = 0; row < diamondSideLength; ++row) {
  const rawDenominator = diamondLimit - row;
  for (let col = 0; col < diamondSideLength; ++col) {
    const rawNumerator = diamondLimit - col;
    let { numerator, denominator } = factorDown({ numerator: rawNumerator, denominator: rawDenominator });
    diamondRatioMap.set(`${numerator}/${denominator}`, { numerator, denominator });
  }
}

var diamondRatios = [...diamondRatioMap.values()];
diamondRatios.sort((a, b) => a.denominator - b.denominator);
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

