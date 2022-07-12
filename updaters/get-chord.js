import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';

// TODO: Different curve for each period, multiple periods.
export function getChord({ ticks, probable, densityOverTimeArray, totalTicks }) {
  // TODO: Find out how to calculate c.
  //const chordPitchCount = Math.round(mag * Math.sin(mag + 1.5*Math.PI) + mag) || 1;
  //const chordPitchCount = Math.round(denseness * tonalityDiamondPitches.length) || 1;

  const chordPitchCount = densityOverTimeArray[Math.floor(ticks/totalTicks * densityOverTimeArray.length)];

  console.log('chordPitchCount', chordPitchCount);
  // Slightly off start times.
  var delays = range(chordPitchCount).map(() => probable.roll(2) === 0 ? 0 : probable.roll(10)/10 *1); 
  return { rates: tonalityDiamondPitches.slice(0, chordPitchCount), delays };
}

