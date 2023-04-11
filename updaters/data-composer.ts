import { tonalityDiamondPitches } from '../tonality-diamond';
import { range } from 'd3-array';
import { scalePow } from 'd3-scale';
import { easeExpIn, easeExpOut } from 'd3-ease';
import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { ScoreState, ScoreEvent } from '../types';

const maxPitchCount = tonalityDiamondPitches.length;
const beginningLengthAsAProportion = 0.025;
const minTickLength = 0.125;
const lastEventLengthFactor = 96;
const durationScaleInOutInflection = 0.7;
const durationFactor = 10;

//const lowestRatio = tonalityDiamondPitches.reduce(
//(lowest, current) => (lowest < current ? lowest : current),
//10
//);
//const highestRatio = tonalityDiamondPitches.reduce(
//(highest, current) => (highest > current ? highest : current),
//-10
//);
//
//var ratioToGainAdjScale = scalePow()
//.exponent(2)
//.domain([lowestRatio, highestRatio])
//.range([0.0001, 1.0]);

export function DataComposer({
  tempoFactor = 1,
  data,
  chordProp,
  chordXFloor,
  chordXCeil,
  seed,
  chordScaleExponent,
  chordSizeLengthExp,
  totalTicks,
}) {
  // Testing with equal length of data and piece length right now. Maybe enforce that?
  var chordScale = scalePow()
    .exponent(chordScaleExponent)
    //scaleLinear()
    .domain([chordXFloor, chordXCeil])
    .range([1, maxPitchCount]);
  var index = 0;
  var pastPitchCounts = [];
  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getScoreState };

  function getScoreState(tickIndex): ScoreState {
    var sourceDatum = data[index];
    var chordPitchCount = Math.round(chordScale(+sourceDatum[chordProp]));
    if (chordPitchCount < 1) {
      console.log('Bad data point', index, chordProp, +data[index][chordProp]);
      if (index > 0) {
        chordPitchCount = pastPitchCounts[index - 1];
      } else {
        chordPitchCount = 1;
      }
    }
    pastPitchCounts.push(chordPitchCount);
    const tickLength = getTickLength();
    var scoreState = {
      events: range(chordPitchCount).map(getScoreEvent),
      tickIndex: index,
      tickLength,
      durationTicks: getDurationTicks(tickIndex),
      meta: { chordPitchCount },
    };
    var pans = getPans(chordPitchCount);
    pans.forEach((pan, i) => (scoreState.events[i].pan = pan));
    index += 1;
    return scoreState;

    function getScoreEvent(
      chordIndex: number
      //arrayIndex: number,
      //pitches: number[]
    ): ScoreEvent {
      return {
        rate: tonalityDiamondPitches[chordIndex],
        delay: 0,
        peakGain: 1.0 / maxPitchCount,
        //ratioToGainAdjScale(tonalityDiamondPitches[chordIndex]) *
        //(1.0 / pitches.length),
        // Undefined loopEndSeconds tells the director to play to the end of the sample.
        loop: { loopStartSeconds: 0.1, loopEndSeconds: undefined },
        meta: { sourceDatum },
      };
    }
  }

  function getPans(chordPitchCount: number): number[] {
    var pans = [0];
    if (chordPitchCount > 1) {
      const maxWidth = (chordPitchCount / maxPitchCount) * 0.7 + 0.3;
      const leftmost = -maxWidth;
      const panIncrement = (2 * maxWidth) / (chordPitchCount - 1);
      pans = range(chordPitchCount).map((i) => leftmost + i * panIncrement);
      // Uncomment to check to see if panning is working.
      //pans = range(chordPitchCount).map(i => (leftmost + i * panIncrement) > 0 ? 1 : -1);
    }
    pans = prob.shuffle(pans);
    return pans;
  }

  function getTickLength() {
    if (index === data.length - 1) {
      return tempoFactor * lastEventLengthFactor;
    }

    var tickLength = 1;
    const pastPitchCount = pastPitchCounts[pastPitchCounts.length - 1];
    if (pastPitchCounts.length > 0) {
      const propOfDiamondUnused =
        (maxPitchCount - pastPitchCount) / maxPitchCount;
      tickLength =
        tickLength * Math.pow(propOfDiamondUnused, chordSizeLengthExp);
      //(0.8 + 0.4 * prob.roll(100)/100);
    }
    tickLength *= tempoFactor;
    // Start slow, then get faster.
    const progress = pastPitchCount / data.length;
    var progressFactor;
    //if (progress > 0.05) {
    //progressFactor = 10 * Math.log10(4 * progress + 2.7) + 3;
    progressFactor = 5 * Math.pow(Math.exp(-4 * progress), 2) - 0;
    //} else {
    ////progressFactor = 0.5 * Math.cos(2 * Math.PI - Math.PI) + 1;
    //progressFactor = 1;
    //}
    if (progress < beginningLengthAsAProportion) {
      const factorBoost = (1 - progress / beginningLengthAsAProportion) * 10;
      progressFactor += factorBoost;
    }

    tickLength *= progressFactor;
    if (tickLength < minTickLength) {
      //console.log('flooring', pastPitchCounts.length);
      tickLength = minTickLength;
    }

    return tickLength;
  }

  function getDurationTicks(tickIndex) {
    const proportion = tickIndex / totalTicks;
    let eventSpecificDurationFactor;
    if (proportion < durationScaleInOutInflection) {
      eventSpecificDurationFactor = easeExpIn(proportion / durationScaleInOutInflection);
    } else {
      eventSpecificDurationFactor =
        easeExpIn(1) +
        easeExpOut(
          (proportion - durationScaleInOutInflection) /
            (1 - durationScaleInOutInflection)
        );
    }
    return Math.max(1, eventSpecificDurationFactor * durationFactor);
  }
}
