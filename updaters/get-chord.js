import { densificationPeriod, totalTicks } from '../consts';
import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';

var descendingMode = false;

export function getChord({ ticks, probable }) {
  // TODO: Try something less linear.
  const densificationCoeff = ticks / totalTicks;

  var periodTick = ticks % densificationPeriod;
  // Tick down in descendingMode, tick up otherwise.
  if (descendingMode) {
    periodTick = densificationPeriod - periodTick;
    descendingMode = periodTick > 1;
  } else {
    descendingMode = periodTick >= densificationPeriod - 1;
  }
  
  const denseness = (periodTick/densificationPeriod % densificationPeriod) * densificationCoeff;
  const chordPitchCount = Math.round(denseness * tonalityDiamondPitches.length) || 1;
  console.log('chordPitchCount', chordPitchCount);
  // Slightly off start times.
  var delays = range(chordPitchCount).map(() => probable.roll(2) === 0 ? 0 : probable.roll(10)/10 *1); 
  return { rates: tonalityDiamondPitches.slice(0, chordPitchCount), delays };
}

