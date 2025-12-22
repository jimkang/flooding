import cloneDeep from 'lodash.clonedeep';
import { createProbable as Probable } from 'probable';
import seedrandom from 'seedrandom';
import { ScoreState, ScoreEvent } from 'synthskel/types';

export function Transposer({
  seed,
  freqFactor,
  eventProportionToTranspose,
  shouldLoop,
  loopStartSeconds,
  loopEndSeconds,
  adjustLoopForRate,
  panDelta = 0,
  arpeggiate = false,
  arpeggioRate = 1.0,
}: {
  seed: string;
  freqFactor: number;
  eventProportionToTranspose: number;
  shouldLoop?: boolean;
  loopStartSeconds?: number;
  loopEndSeconds?: number;
  adjustLoopForRate?: boolean;
  panDelta: number;
  arpeggiate?: boolean;
  arpeggioRate: number;
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

    function transposeEvent(
      scoreEvent: ScoreEvent,
      arrayIndex: number,
      events: ScoreEvent[]
    ): ScoreEvent {
      var newEvent = Object.assign({}, scoreEvent);
      if (shouldLoop && !isNaN(loopEndSeconds)) {
        // The actual loop length is affected by the playbackRate.
        newEvent.loop = {
          loopStartSeconds: 0,
          loopEndSeconds: adjustLoopForRate
            ? loopEndSeconds * scoreEvent.rate
            : loopEndSeconds,
        };
      } else {
        delete newEvent.loop;
      }
      newEvent.rate *= freqFactor;
      var newPan = newEvent.pan + panDelta;
      if (newPan < 0) {
        newPan = Math.max(newPan, -1);
      }
      if (newPan > 0) {
        newPan = Math.min(newPan, 1);
      }
      newEvent.pan = newPan;

      if (arpeggiate) {
        newEvent.delay =
          arrayIndex * (refState.tickLength / events.length) * arpeggioRate;
        if (arpeggioRate >= 0.9) {
          newEvent.absoluteLengthSeconds =
            (refState.tickLength / events.length) * 1.1;
        }
      }
      return newEvent;
    }
  }
}
