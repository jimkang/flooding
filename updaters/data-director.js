import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';
//import { scaleLinear } from 'd3-scale';
import { scalePow } from 'd3-scale';

const maxPitchCount = tonalityDiamondPitches.length;

export function DataDirector({ tempoFactor = 1, data, chordProp, chordXFloor, chordXCeil }) {
  var chordScale = scalePow().exponent(50).domain([chordXFloor, chordXCeil]).range([1, maxPitchCount]);
  var index = 0;

  return { getChord, getTickLength };

  function getChord() {
    var chordPitchCount = chordScale(+data[index][chordProp]);
    var delays = range(chordPitchCount).map(() => 
      0
    ); 

    index += 1;

    return { 
      rates: tonalityDiamondPitches.slice(0, chordPitchCount), 
      delays, 
      meta: {
        chordPitchCount
      }
    };
  }

  function getTickLength() {
    var tickLength = 1;
    tickLength *= tempoFactor;
    return tickLength;
  }
}

