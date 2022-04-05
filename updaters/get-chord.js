import { intervals } from '../consts';

const densificationPeriod = 40;

export function getChord({ tick }) {
  //var detunes = range(0, Math.floor(tick/densificationPeriod * 24) * 24)
  //.map(x => x * 100/24);
  const denseness = tick/densificationPeriod % densificationPeriod;
  const chordPitchCount = Math.round(denseness * intervals.length);
  return { rates: intervals.slice(0, chordPitchCount) };
}

