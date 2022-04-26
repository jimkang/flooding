import { densificationPeriod, totalTicks } from '../consts';
import { tonalityDiamondPitches } from '../tonality-diamond';

var descendingMode = false;

export function getChord({ ticks }) {
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
  // TODO: Slightly off start times?
  return { rates: tonalityDiamondPitches.slice(0, chordPitchCount) };
}

