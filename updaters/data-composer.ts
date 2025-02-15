import { range } from 'd3-array';
import { scalePow } from 'd3-scale';
// import { scaleLinear } from 'd3-scale';
import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { ScoreState, ScoreEvent } from 'synthskel/types';
import { SubjectDatum } from '../types';
import { tonalityDiamondPitches } from '../consts';

const maxPitchCount = tonalityDiamondPitches.length;
// const beginningLengthAsAProportion = 0.025;
const minTickLength = 0.25;
// const lastEventLengthFactor = 96;

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
  shouldLoop,
  loopEndSeconds,
  adjustLoopForRate,
  arpeggiate = false,
  constantTickLength,
  fixedEndTickLength,
  usePauses = true,
}: {
  tempoFactor: number;
  data: SubjectDatum[];
  chordProp: string;
  chordXFloor: number;
  chordXCeil: number;
  seed: string;
  chordScaleExponent: number;
  chordSizeLengthExp: number;
  totalTicks: number;
  shouldLoop?: boolean;
  loopEndSeconds?: number;
  adjustLoopForRate?: boolean;
  arpeggiate?: boolean;
  constantTickLength?: boolean;
  fixedEndTickLength?: number;
  usePauses?: boolean;
}) {
  // Testing with equal length of data and piece length right now. Maybe enforce that?
  // var chordScale = scaleLinear().domain([chordXFloor, chordXCeil]).range([1, maxPitchCount]);
  var chordScale = scalePow()
    .exponent(chordScaleExponent)
    .domain([chordXFloor, chordXCeil])
    .range([1, maxPitchCount]);
  var index = 0;
  var pastPitchCounts = [];
  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getScoreState };

  function getScoreState(tickIndex): ScoreState {
    var sourceDatum = data[index];

    var tickLength = getTickLength(sourceDatum);

    if (!isNaN(fixedEndTickLength) && tickIndex === totalTicks - 1) {
      tickLength = fixedEndTickLength;
    }

    var scoreState: ScoreState = {
      events: [],
      tickIndex: index,
      tickLength,
    };

    let chordPitchCount = 0;
    if (usePauses && sourceDatum.startOfDecade) {
      // Take a break.
      scoreState.tickLength = 2;
      scoreState.grandPause = true;
      pastPitchCounts.push(1);
    } else {
      chordPitchCount = Math.round(chordScale(+sourceDatum[chordProp]));
      if (chordPitchCount < 1) {
        console.log(
          'Bad data point',
          index,
          chordProp,
          +data[index][chordProp]
        );
        if (index > 0) {
          chordPitchCount = pastPitchCounts[index - 1];
        } else {
          chordPitchCount = 1;
        }
      }
      pastPitchCounts.push(chordPitchCount);
      // Stretch it out for the arpeggios.

      scoreState.events = range(chordPitchCount).map(getScoreEvent);

      let pans = getPans(chordPitchCount);
      pans.forEach((pan, i) => (scoreState.events[i].pan = pan));
    }

    scoreState.meta = { chordPitchCount, sourceDatum };
    index += 1;
    return scoreState;

    function getScoreEvent(
      chordIndex: number,
      arrayIndex: number,
      pitches: number[]
    ): ScoreEvent {
      const rate = tonalityDiamondPitches[chordIndex];
      var loop;
      if (!arpeggiate && shouldLoop) {
        // The actual loop length is affected by the playbackRate.
        loop = {
          loopStartSeconds: 0,
          loopEndSeconds: adjustLoopForRate
            ? loopEndSeconds * rate
            : loopEndSeconds,
        };
      }
      var scoreEvent: ScoreEvent = {
        rate,
        // TODO: Support arpeggioRate.
        delay: arpeggiate ? arrayIndex * (tickLength / pitches.length) : 0,
        absoluteLengthSeconds: arpeggiate
          ? (tickLength / pitches.length) * 1.1
          : undefined,
        peakGain: 1.0 / maxPitchCount,
        //ratioToGainAdjScale(tonalityDiamondPitches[chordIndex]) *
        //(1.0 / pitches.length),
        // Undefined loopEndSeconds tells the director to play to the end of the sample.
        loop,
        reverb: true,
        finite: true,
        meta: { sourceDatum },
      };
      if (!isNaN(fixedEndTickLength) && tickIndex === totalTicks - 1) {
        scoreEvent.absoluteLengthSeconds = fixedEndTickLength;
      }
      return scoreEvent;
    }
  }

  function getPans(chordPitchCount: number): number[] {
    var pans = [0];
    if (chordPitchCount > 1) {
      const maxWidth = 0.5 + 1.5 * (chordPitchCount / maxPitchCount);
      const panIncrement = maxWidth / (chordPitchCount + 1);
      const leftmost = -1.0 + (2.0 - maxWidth) / 2;
      pans = range(chordPitchCount).map((i) => leftmost + i * panIncrement);
      // Uncomment to check to see if panning is working.
      //pans = range(chordPitchCount).map(i => (leftmost + i * panIncrement) > 0 ? 1 : -1);
    }
    pans = prob.shuffle(pans);
    return pans;
  }

  function getTickLength(currentDatum) {
    var tickLength = 1;

    if (constantTickLength) {
      return tickLength * tempoFactor;
    }
    const chordPitchCount = Math.round(chordScale(+currentDatum[chordProp]));
    const propOfDiamondUnused =
      (maxPitchCount - chordPitchCount) / maxPitchCount;
    tickLength = tickLength * Math.pow(propOfDiamondUnused, chordSizeLengthExp);
    //(0.8 + 0.4 * prob.roll(100)/100);

    tickLength *= tempoFactor;

    if (tickLength < minTickLength) {
      tickLength = minTickLength;
    }

    return tickLength;
  }
}
