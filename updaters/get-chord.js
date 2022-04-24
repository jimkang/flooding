import { densificationPeriod, tonalityDiamondPitches } from '../consts';

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
  
  // TODO: Don't go all the way to max denseness every single time. 
  const denseness = periodTick/densificationPeriod % densificationPeriod;
  const chordPitchCount = Math.round(denseness * tonalityDiamondPitches.length);
  console.log('chordPitchCount', chordPitchCount);
  // TODO: Slightly off start times?
  return { rates: tonalityDiamondPitches.slice(0, chordPitchCount) };
}

