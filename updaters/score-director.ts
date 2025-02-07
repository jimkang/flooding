import {
  Sampler,
  Osc,
  Envelope,
  Panner,
  SynthNode,
} from 'synthskel/synths/synth-node';
import { ScoreState, ScoreEvent, PlayEvent } from 'synthskel/types';
import DataJoiner from 'data-joiner';
import curry from 'lodash.curry';
import {
  playPlayEvent,
  newPlayEventForScoreEvent,
} from 'synthskel/tasks/play-event';
import { goodlog } from '../tasks/goodlog';

function defaultIdScoreEvent(scoreEvent: ScoreEvent) {
  return scoreEvent.rate.toFixed(5);
}

export function ScoreDirector({
  ctx,
  sampleBuffer,
  outNode,
  ampFactor = 1.0,
  fadeLengthFactor = 2.0,
  envelopeLengthFactor = 1.2,
  constantEnvelopeLength = undefined,
  getEnvelopeLengthForScoreEvent,
  envelopeCurve = null,
  variableSampleBuffers = null,
  directorName,
  idScoreEvent = defaultIdScoreEvent,
  slideMode = true,
  baseFreq = 329.628, // E4
  mute = false,
}) {
  var keyFn = idScoreEvent;
  // In slideMode, use the default DataJoiner behavior, which uses the data array positions as ids.
  if (slideMode) {
    keyFn = null;
  }
  var scoreEventJoiner = DataJoiner({ keyFn });
  var playEvents: PlayEvent[] = [];

  return { play, end };

  function end() {
    play({
      events: [],
      tickIndex: Infinity,
      tickLength: 1,
    });
  }

  function play(state: ScoreState) {
    if (mute) {
      return;
    }
    scoreEventJoiner.update(state.events);
    goodlog(
      directorName,
      'Starting play() with scoreEvents',
      state.events.map((e) => idScoreEvent(e))
    );

    var exitingScoreEvents = scoreEventJoiner.exit();
    goodlog(
      directorName,
      'exitingScoreEvents',
      exitingScoreEvents.map(idScoreEvent)
    );
    var exitingPlayEvents = exitingScoreEvents.map(
      existingPlayEventForScoreEvent
    );
    checkExitingPlayEvents(exitingPlayEvents);
    removePlayEventsFromList(exitingPlayEvents, playEvents);
    var fadeStartOffset = 0; //state.tickLength * (state.durationTicks + 0.3 || 1);
    var fadeLength = state.tickLength;
    if (fadeLength > 1) {
      fadeLength *= fadeLengthFactor;
    }
    if (state.grandPause) {
      // Stop everything right now.
      fadeLength = state.tickLength;
    }
    exitingPlayEvents.forEach(curry(fadeToDeath)(fadeStartOffset, fadeLength));

    var newScoreEvents = scoreEventJoiner.enter();
    goodlog(directorName, 'newScoreEvents', newScoreEvents.map(idScoreEvent));
    var newPlayEvents = newScoreEvents.map((scoreEvt) =>
      newPlayEventForScoreEvent({
        // GenNodeClass: Osc,
        scoreEvent: scoreEvt,
        sampleBuffer,
        variableSampleBuffers,
        impulseBuffer: null,
        ctx,
        tickLength: state.tickLength,
        slideMode,
        envelopeCurve,
        ampFactor,
        getEnvelopeLengthForScoreEvent:
          getEnvelopeLengthForScoreEvent || defaultGetEnvelopeLength,
        baseFreq,
        // shape: 'triangle',
      })
    );
    newPlayEvents.forEach(curry(appendIfNotYetInList)(playEvents));
    newPlayEvents.forEach(
      (playEvent) => connectLastToDest(playEvent.nodes)
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );

    const baseStartTime = ctx.currentTime;
    // TODO: parameterize start and end times.
    newPlayEvents.forEach((playEvent) =>
      playPlayEvent({ playEvent, startTime: baseStartTime })
    );

    goodlog(
      directorName,
      'current scoreEvents',
      state.events.map((e) => idScoreEvent(e))
    );
    goodlog(
      directorName,
      'current playEvents',
      getIdsForPlayEvents(playEvents)
    );
    state.events
      .map(existingPlayEventForScoreEvent)
      .forEach(curry(updatePlayEventNodeParams)(state.tickLength));

    function existingPlayEventForScoreEvent(
      scoreEvent: ScoreEvent,
      index: number
    ): PlayEvent {
      var playEvent: PlayEvent;
      const id = idScoreEvent(scoreEvent);
      if (slideMode && index < playEvents.length) {
        playEvent = playEvents[index];
      } else {
        playEvent = playEvents.find(
          (playEvent) => idScoreEvent(playEvent.scoreEvent) === id
        );
      }
      if (!playEvent) {
        throw new Error(`Could not find a play event for ${id}.`);
      }
      return playEvent;
    }

    function removePlayEventsFromList(
      playEventsToRemove: PlayEvent[],
      list: PlayEvent[]
    ) {
      const indexes = playEventsToRemove
        .map(findEventToRemove)
        .sort(slideMode ? compareIndexes : checkCompare);

      goodlog(
        'Removing indexes',
        indexes,
        'from list',
        getIdsForPlayEvents(list)
      );
      indexes.forEach((index) => list.splice(index, 1));
      goodlog('playEvents after removal', getIdsForPlayEvents(list));
    }

    function findEventToRemove(eventToRemove: PlayEvent): number {
      const index = playEvents.findIndex(
        (e) =>
          idScoreEvent(e.scoreEvent) === idScoreEvent(eventToRemove.scoreEvent)
      );
      if (index < 0) {
        throw new Error(
          `Could not find ${idScoreEvent(
            eventToRemove.scoreEvent
          )} in playEvents for deletion.`
        );
      }
      return index;
    }
  }

  function connectLastToDest(chain: SynthNode[]) {
    // TODO: Connect to limiter instead.
    if (chain.length > 0) {
      chain[chain.length - 1].connect({
        synthNode: outNode,
        audioNode: null,
      });
    }
  }

  function checkExitingPlayEvents(exitingPlayEvents) {
    var unplayedExitingPlayEvent: PlayEvent = exitingPlayEvents.find(
      (e) => !e.started
    );
    if (unplayedExitingPlayEvent) {
      // It's OK if rests are not played.
      if (!unplayedExitingPlayEvent.rest) {
        throw new Error(
          `${unplayedExitingPlayEvent.scoreEvent.rate} is exiting even though it has not started.`
        );
      }
    }
    var playEventIds = getIdsForPlayEvents(playEvents);
    var exitingPlayEventNotInList = exitingPlayEvents.find(
      (e) => !playEventIds.includes(idScoreEvent(e.scoreEvent))
    );
    if (exitingPlayEventNotInList) {
      throw new Error(
        `${idScoreEvent(
          exitingPlayEventNotInList.scoreEvent
        )} is exiting even though it is not in the current playEvents.`
      );
    }
  }

  function appendIfNotYetInList(list: PlayEvent[], item: PlayEvent) {
    if (slideMode) {
      list.push(item);
      return;
    }

    const newId = idScoreEvent(item.scoreEvent);
    var existing = list.find(
      (listItem) => idScoreEvent(listItem.scoreEvent) === newId
    );
    if (!existing) {
      list.push(item);
    }
  }

  function getIdsForPlayEvents(playEvents: PlayEvent[]): string[] {
    return playEvents.map((e) => idScoreEvent(e.scoreEvent));
  }

  function defaultGetEnvelopeLength(
    scoreEvent: ScoreEvent,
    tickLength: number
  ): number {
    if (!isNaN(scoreEvent.absoluteLengthSeconds)) {
      return scoreEvent.absoluteLengthSeconds;
    }
    if (constantEnvelopeLength) {
      return constantEnvelopeLength;
    }
    return tickLength * envelopeLengthFactor;
  }

  function updatePlayEventNodeParams(tickLength: number, playEvent: PlayEvent) {
    var genNode = playEvent.nodes.find(
      (node) => node instanceof Osc || node instanceof Sampler
    );
    if (genNode) {
      if (genNode instanceof Osc) {
        genNode.params.freq = playEvent.scoreEvent.rate * baseFreq;
      } else {
        genNode.params.playbackRate = playEvent.scoreEvent.rate;
      }
      genNode.syncToParams();
    }
    var pannerNode = playEvent.nodes.find((node) => node instanceof Panner);
    if (pannerNode) {
      pannerNode.params.rampSeconds = tickLength;
      pannerNode.params.pan = playEvent.scoreEvent.pan;
      pannerNode.syncToParams();
    }
    //var envelopeNode: Envelope = playEvent.nodes.find(node => node instanceof Envelope) as Envelope;
    //if (envelopeNode) {
    //// TODO: Use current tick size to determine ramp time.
    //envelopeNode.linearRampTo(0.2, playEvent.scoreEvent.peakGain);
    //}
  }
}

function fadeToDeath(
  fadeStartOffset: number,
  defaultFadeSeconds: number,
  playEvent: PlayEvent
) {
  // Respect absoluteLengthSeconds if it's there.
  var fadeSeconds = playEvent.scoreEvent.absoluteLengthSeconds;
  if (isNaN(fadeSeconds)) {
    fadeSeconds = playEvent.scoreEvent.fadeLength;
  }
  if (isNaN(fadeSeconds)) {
    fadeSeconds = defaultFadeSeconds;
  }
  if (!playEvent.rest) {
    goodlog('Fading', playEvent.scoreEvent.rate);
    var envelopeNode: Envelope = playEvent.nodes.find(
      (node) => node instanceof Envelope
    ) as Envelope;
    if (!envelopeNode) {
      throw new Error("Can't fade this. It's missing a Envelope synth node!");
    }

    // TODO: Something else should manage canceling other scheduled events.
    playEvent.nodes.forEach((node) => node.cancelScheduledRamps());
    setTimeout(
      () => envelopeNode.linearRampTo(fadeSeconds, 0),
      fadeStartOffset * 1000
    );
  }
  setTimeout(
    () => decommisionNodes(playEvent),
    (fadeStartOffset + fadeSeconds + 1) * 1000
  );
}

// TODO: Find out if this is even necessary.
function decommisionNodes(playEvent: PlayEvent) {
  try {
    playEvent.nodes.forEach(decommisionNode);
  } catch (error) {
    console.error('Failed to decommision', playEvent, error);
  }
  playEvent.nodes.length = 0;
}

function decommisionNode(synthNode: SynthNode) {
  // eslint-disable-next-line
  var audioNode = synthNode.node as any;
  if (audioNode.stop) {
    audioNode.stop();
  }
  if (audioNode.disconnect) {
    audioNode.disconnect();
  }
}

// Sort high to low, look for duplicates which should not be in the list.
function checkCompare(a, b) {
  if (a > b) {
    return -1;
  }
  if (a < b) {
    return 1;
  }
  throw new Error(
    `There is a duplicate in the PlayEvents to remove at index ${a}.`
  );
}

function compareIndexes(a, b) {
  if (a > b) {
    return -1;
  }
  return 1;
}
