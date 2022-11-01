import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';

const maxPitchCount = tonalityDiamondPitches.length;

export function Director({ seed, tempoFactor = 1 }) {
  var harshnessDischargeThreshold = 4;
  var harshnessBattery = 0;
  var boredomBattery = 0;
  var direction = 1;
  var pastPitchCounts = [];
  var peak = 1;

  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getChord, getTickLength };

  function getChord() {
    var chordPitchCount = 0;
    if (pastPitchCounts.length > 0) {
      chordPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
    }

    chordPitchCount += direction;

    if (direction > 0 && chordPitchCount >= peak) {
      direction = -1;
      if (peak < tonalityDiamondPitches.length) {
        peak += 1;
      }
    } else if (direction < 0 && chordPitchCount <= 0) {
      direction = 1;
    }

    // TODO: Use rest of pastPitchCounts.
    pastPitchCounts.push(chordPitchCount);
    
    // Slightly off start times.
    var delays = range(chordPitchCount).map(() => 
      //prob.roll(2) === 0 ? 0 : Math.min(prob.roll(10)/10 *1, 1)
      0
    ); 
    return { 
      rates: tonalityDiamondPitches.slice(0, chordPitchCount), 
      delays, 
      meta: {
        harshnessBattery,
        harshnessDischargeThreshold,
        boredomBattery,
        direction,
        chordPitchCount
      }
    };
  }

  function getTickLength() {
    var tickLength = 1;
    if (pastPitchCounts.length > 0) {
      const pastPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
      const propOfDiamondUnused = (maxPitchCount - pastPitchCount)/maxPitchCount;
      tickLength = tickLength * Math.pow(propOfDiamondUnused, 3);
      //(0.8 + 0.4 * prob.roll(100)/100);
    }
    tickLength *= tempoFactor;
    return tickLength;
  }
}

