import { intervals } from '../consts';

const densificationPeriod = 30;
var descendingMode = false;

export function getChord({ tick }) {
  var periodTick = tick % densificationPeriod;
  // Tick down in descendingMode, tick up otherwise.
  if (descendingMode) {
    periodTick = densificationPeriod - periodTick;
    descendingMode = periodTick > 1;
  } else {
    descendingMode = periodTick >= densificationPeriod - 1;
  }
   
  const denseness = periodTick/densificationPeriod % densificationPeriod;
  const chordPitchCount = Math.round(denseness * intervals.length);
  return { rates: intervals.slice(0, chordPitchCount) };
}

