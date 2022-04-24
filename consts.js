export const bigTempoWaveAmp = 0.15;
export const densificationPeriod = 30;
export const totalTicks = densificationPeriod;
export const timeNeededForEnvelopeDecay = 2.0;

// At about 60 bpm, the 16-beat riff takes up about a
// quarter of a minute.

export var startingIntervals = [
  1, // root
  2, // octave
  1.5, // fifth
  4 / 3, // fourth
  1.25, // major third
  6 / 5, // minor third
  9 / 8, // major second
  16 / 9, // minor seventh
  27 / 16, // major sixth
  128 / 81, // minor sixth
  243 / 128, // major seventh
  256 / 243, // minor second
  729 / 512, // tritone!
];

const limit = 15;
const diamondSideLength = Math.ceil(limit/2);

var diamondRatios = [];

for (let row = 0; row < diamondSideLength; ++row) {
  const denominator = limit - row;
  for (let col = 0; col < diamondSideLength; ++col) {
    const numerator = limit - col;
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

