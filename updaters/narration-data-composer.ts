import cloneDeep from 'lodash.clonedeep';
import { ScoreState, ScoreEvent } from '../types';

// Assumes that the sample buffers given to the director will be in the order that
// they need to be played in.
// TODO: DataComposer needs to leave in source data.
// This needs to be come a "copy composer" like Transposer.
export function NarrationDataComposer() {
  var sampleIndex = 0;
  var currentDecade = 0;

  return { getScoreState };

  function getScoreState(refState: ScoreState): ScoreState {
    return {
      tickIndex: refState.tickIndex,
      tickLength: refState.tickLength,
      meta: cloneDeep(refState.meta),
      events: [getScoreEvent(refState.events[0])],
    };

    function getScoreEvent(refEvent: ScoreEvent): ScoreEvent {
      var event = {
        rate: 1,
        delay: 0,
        peakGain: 1,
        pan: 0,
        meta: cloneDeep(refEvent.meta),
      };

      const eventDecade = ~~(+refEvent.meta.sourceDatum.year / 10);
      const decadeChanged = eventDecade !== currentDecade;

      if (decadeChanged) {
        currentDecade = eventDecade;
        const variableSampleIndex = sampleIndex;
        sampleIndex += 1;

        console.log(
          'Narration using sample',
          variableSampleIndex,
          'at tick',
          refState.tickIndex
        );

        // The narration samples should play in full without getting faded out.
        return Object.assign({ variableSampleIndex, fadeLength: 5 }, event);
      } else {
        return Object.assign({ rest: true }, event);
      }
    }
  }
}
