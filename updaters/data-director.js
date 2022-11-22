import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';
//import { scaleLinear } from 'd3-scale';
import { scalePow } from 'd3-scale';

const maxPitchCount = tonalityDiamondPitches.length;

export function DataDirector({ tempoFactor = 1, data, chordProp, chordXFloor, chordXCeil }) {
  // Testing with equal length of data and piece length right now. Maybe enforce that?
  var chordScale = 
    scalePow().exponent(25)
    //scaleLinear()
      .domain([chordXFloor, chordXCeil]).range([1, maxPitchCount]);
  var index = 0;
  var pastPitchCounts = [];

  return { getChord, getTickLength };

  function getChord() {
    var chordPitchCount = chordScale(+data[index][chordProp]);
    pastPitchCounts.push(chordPitchCount);
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
    if (pastPitchCounts.length > 0) {
      const pastPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
      const propOfDiamondUnused = (maxPitchCount - pastPitchCount)/maxPitchCount;
      tickLength = tickLength * Math.pow(propOfDiamondUnused, 3);
      //(0.8 + 0.4 * prob.roll(100)/100);
    }
    tickLength *= tempoFactor;
    return tickLength;
  }
}

