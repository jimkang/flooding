import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';

const boredomDischargeThreshold = 3;

export function Director({ seed, tempoFactor = 1 }) {
  var harshnessDischargeThreshold = 4;
  var harshnessBattery = 0;
  var boredomBattery = 0;
  var direction = 1;
  var pastPitchCounts = [];

  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getChord, getTickLength };

  function getChord() {
  // TODO: Find out how to calculate c.
  //const chordPitchCount = Math.round(mag * Math.sin(mag + 1.5*Math.PI) + mag) || 1;
  //const chordPitchCount = Math.round(denseness * tonalityDiamondPitches.length) || 1;

    var chordPitchCount = 1;
    if (pastPitchCounts.length > 0) {
      chordPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
    }
    if (harshnessBattery >= harshnessDischargeThreshold) {
      direction = -1;
      harshnessDischargeThreshold += 1;
    }
    if (boredomBattery >= boredomDischargeThreshold) {
      chordPitchCount += direction;
      if (chordPitchCount === 0) {
        direction = 1;
        chordPitchCount = 1;
      } else if (chordPitchCount >= tonalityDiamondPitches.length) {
        direction = -1;
        chordPitchCount = tonalityDiamondPitches.length - 1;
      } 
      boredomBattery -= 1;
    } else {
      boredomBattery += 1;
    }

    // TODO: Use rest of pastPitchCounts.
    pastPitchCounts.push(chordPitchCount);
    
    // Slightly off start times.

    var delays = range(chordPitchCount).map(() => prob.roll(2) === 0 ? 0 : prob.roll(10)/10 *1); 
    return { 
      rates: tonalityDiamondPitches.slice(0, chordPitchCount), 
      delays, 
      meta:{harshnessBattery, harshnessDischargeThreshold, boredomBattery, direction, chordPitchCount}
    };
  }

  function getTickLength() {
    var tickLength = 1;
    if (pastPitchCounts.length > 0) {
      tickLength = pastPitchCounts[pastPitchCounts.length - 1]/tonalityDiamondPitches.length * (0.8 + 0.4 * prob.roll(100)/100);
    }
    tickLength *= tempoFactor;
    return tickLength;
  }
}

