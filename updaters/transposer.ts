import cloneDeep from 'lodash.clonedeep';
import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { ScoreState, ScoreEvent } from '../types';

export function Transposer({ seed, freqFactor, eventProportionToTranspose }: { seed: string; freqFactor: number; eventProportionToTranspose: number  }) {
  var random = seedrandom(seed);
  var prob = Probable({ random });

  return { getScoreState };

  function getScoreState(refState: ScoreState): ScoreState {
    
    return {
      tickIndex: refState.tickIndex,
      tickLength: refState.tickLength,
      meta: cloneDeep(refState.meta),
      events: prob.sample(
        refState.events, Math.max(1, refState.events.length * eventProportionToTranspose)
      )
        .map(transposeEvent)
    };

    function transposeEvent(scoreEvent: ScoreEvent): ScoreEvent {
      var newEvent = Object.assign({}, scoreEvent);
      // TODO: Different loop properties.
      newEvent.rate *= freqFactor;
      newEvent.pan *= -1;
      return newEvent;
    }
  }
}
