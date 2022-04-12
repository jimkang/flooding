import { densificationPeriod, startingIntervals } from '../consts';

var descendingMode = false;

export function getChord({ ticks }) {
  var periodTick = ticks % densificationPeriod;
  // Tick down in descendingMode, tick up otherwise.
  if (descendingMode) {
    periodTick = densificationPeriod - periodTick;
    descendingMode = periodTick > 1;
  } else {
    descendingMode = periodTick >= densificationPeriod - 1;
  }
   
  const denseness = periodTick/densificationPeriod % densificationPeriod;
  const chordPitchCount = Math.round(denseness * startingIntervals.length);
  // TODO: Slightly off start times?
  return { rates: startingIntervals.slice(0, chordPitchCount) };
}

