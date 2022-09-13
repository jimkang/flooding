import { range } from 'd3-array';

export function preRunDirector({ director, totalTicks }) {
  return range(totalTicks).map(getResult);

  function getResult(tickIndex) {
    var chord = director.getChord();
    return {
      tickIndex,
      tickLength: director.getTickLength(),
      chordSize: chord.rates.length,
      chord
    };
  }
}
    
