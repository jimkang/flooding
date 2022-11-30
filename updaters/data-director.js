import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';
//import { scaleLinear } from 'd3-scale';
import { scalePow } from 'd3-scale';

const maxPitchCount = tonalityDiamondPitches.length;
const beginningLengthAsAProportion = 0.05;

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
    if (chordPitchCount < 1) {
      console.log('Bad data point', index, chordProp, +data[index][chordProp]);
      if (index > 0) {
        chordPitchCount = pastPitchCounts[index - 1];
      } else {
        chordPitchCount = 1;
      }
    }
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
    const pastPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
    if (pastPitchCounts.length > 0) {
      const propOfDiamondUnused = (maxPitchCount - pastPitchCount)/maxPitchCount;
      tickLength = tickLength * Math.pow(propOfDiamondUnused, 3);
      //(0.8 + 0.4 * prob.roll(100)/100);
    }
    tickLength *= tempoFactor;
    // Start slow, then get faster.
    const progress = pastPitchCount/data.length;
    var progressFactor;
    //if (progress < 0.515) {
    //progressFactor = 10 * Math.log10(4 * progress + 2.7) + 3;
    progressFactor = 10 * Math.exp(2 * -progress) - 0.5;
    //} else {
    //progressFactor = 0.5 * Math.cos(2 * Math.PI - Math.PI) + 1;
    //}
    if (progress < beginningLengthAsAProportion) {
      const factorBoost = (1 - progress/beginningLengthAsAProportion) * 30;
      progressFactor += factorBoost;
    }

    tickLength *= progressFactor;
    return tickLength;
  }
}

