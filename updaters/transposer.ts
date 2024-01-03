import cloneDeep from 'lodash.clonedeep';
import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { ScoreState, ScoreEvent } from 'synthskel/types';

export function Transposer({
  seed,
  freqFactor,
  eventProportionToTranspose,
  sampleLoopStart,
  sampleLoopEnd,
}: {
  seed: string;
  freqFactor: number;
  eventProportionToTranspose: number;
  sampleLoopStart?: number;
  sampleLoopEnd?: number;
}) {
  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getScoreState };

  function getScoreState(refState: ScoreState): ScoreState {
    return {
      tickIndex: refState.tickIndex,
      tickLength: refState.tickLength,
      meta: cloneDeep(refState.meta),
      events: prob
        .sample(
          refState.events,
          Math.max(1, refState.events.length * eventProportionToTranspose)
        )
        .map(transposeEvent),
    };

    function transposeEvent(scoreEvent: ScoreEvent): ScoreEvent {
      var newEvent = Object.assign({}, scoreEvent);
      if (!isNaN(sampleLoopStart) && !isNaN(sampleLoopEnd)) {
        newEvent.loop = {
          loopStartSeconds: sampleLoopStart,
          loopEndSeconds: sampleLoopEnd,
        };
      }
      newEvent.rate *= freqFactor;
      // TODO: Figure out a better distribution.
      newEvent.pan *= -1;
      return newEvent;
    }
  }
}
