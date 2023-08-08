import {
  Sampler,
  Envelope,
  Panner,
  SynthNode,
  Gain,
} from 'synthskel/synths/synth-node';
import { ScoreState, ScoreEvent, PlayEvent } from '../types';
import DataJoiner from 'data-joiner';
import curry from 'lodash.curry';

function defaultIdScoreEvent(scoreEvent: ScoreEvent) {
  return scoreEvent.rate.toFixed(5);
}

export function ScoreDirector({
  ctx,
  sampleBuffer,
  mainOutNode,
  ampFactor = 1.0,
  fadeLengthFactor = 2.0,
  envelopeLengthFactor = 1.0,
  constantEnvelopeLength = undefined,
  envelopeCurve = null,
  variableSampleBuffers = null,
  directorName,
  idScoreEvent = defaultIdScoreEvent,
  slideMode = true,
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
    scoreEventJoiner.update(state.events);
    console.log(
      directorName,
      'Starting play() with scoreEvents',
      state.events.map((e) => idScoreEvent(e))
    );

    var exitingScoreEvents = scoreEventJoiner.exit();
    console.log(
      directorName,
      'exitingScoreEvents',
      exitingScoreEvents.map(idScoreEvent)
    );
    var exitingPlayEvents = exitingScoreEvents.map(
      existingPlayEventForScoreEvent
    );
    checkExitingPlayEvents(exitingPlayEvents);
    removePlayEventsFromList(exitingPlayEvents, playEvents);
    const fadeStartOffset = state.tickLength * (state.durationTicks || 1);
    var fadeLength = state.tickLength;
    if (fadeLength > 1) {
      fadeLength *= fadeLengthFactor;
    }
    exitingPlayEvents.forEach(curry(fadeToDeath)(fadeStartOffset, fadeLength));

    var newScoreEvents = scoreEventJoiner.enter();
    console.log(
      directorName,
      'newScoreEvents',
      newScoreEvents.map(idScoreEvent)
    );
    var newPlayEvents = newScoreEvents.map(
      curry(newPlayEventForScoreEvent)(state.events.length)
    );
    newPlayEvents.forEach(curry(appendIfNotYetInList)(playEvents));
    newPlayEvents.forEach(
      (playEvent) => connectLastToDest(playEvent.nodes)
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );

    const baseStartTime = ctx.currentTime;
    // TODO: parameterize start and end times.
    newPlayEvents.forEach(playPlayEvent);

    console.log(
      directorName,
      'current scoreEvents',
      state.events.map((e) => idScoreEvent(e))
    );
    console.log(
      directorName,
      'current playEvents',
      getIdsForPlayEvents(playEvents)
    );
    state.events
      .map(existingPlayEventForScoreEvent)
      .forEach(curry(updatePlayEventNodeParams)(state.tickLength));

    function playPlayEvent(playEvent: PlayEvent) {
      if (playEvent.rest) {
        return;
      }

      console.log('Playing', playEvent.scoreEvent.rate);
      const startTime = baseStartTime + playEvent.scoreEvent.delay;
      //const endTime = startTime + state.tickLength;
      playEvent.nodes.forEach((synth) =>
        synth.play({ startTime, indefinite: true })
      );
      playEvent.started = true;
    }

    function newPlayEventForScoreEvent(
      totalScoreEventCount: number,
      scoreEvent: ScoreEvent
    ): PlayEvent {
      if (scoreEvent.rest) {
        return {
          scoreEvent,
          started: false,
          nodes: [],
          rest: true,
        };
      }

      var eventSampleBuffer = sampleBuffer;
      if (directorName === 'narration') {
        console.log(
          'variableSampleBuffers.length',
          variableSampleBuffers.length,
          'variableSampleIndex',
          scoreEvent.variableSampleIndex
        );
      }

      if (
        variableSampleBuffers &&
        !isNaN(scoreEvent.variableSampleIndex) &&
        scoreEvent.variableSampleIndex < variableSampleBuffers.length
      ) {
        eventSampleBuffer =
          variableSampleBuffers[scoreEvent.variableSampleIndex];
      }
      var sampler = new Sampler(ctx, {
        sampleBuffer: eventSampleBuffer, // TODO: Sample buffer by name.
        playbackRate: scoreEvent.rate,
        loop: !!scoreEvent.loop,
        loopStart: scoreEvent?.loop?.loopStartSeconds,
        loopEnd: scoreEvent?.loop?.loopEndSeconds,
        timeNeededForEnvelopeDecay: state.tickLength,
        enableRamp: slideMode,
        rampSeconds: state.tickLength / 5,
      });
      //const maxGain = 0.8/Math.pow(totalScoreEventCount, 3);
      var envelope = new Envelope(ctx, {
        envelopeMaxGain: scoreEvent.peakGain,
        envelopeLengthProportionToEvent: 1.2,
        envelopeLength: getEnvelopeLengthForScoreEvent(
          scoreEvent,
          state.tickLength
        ),
        playCurve: envelopeCurve,
      });
      var panner = new Panner(ctx, {
        pan: scoreEvent.pan,
        rampSeconds: state.tickLength,
      });

      sampler.connect({ synthNode: envelope, audioNode: null });
      envelope.connect({ synthNode: panner, audioNode: null });

      var nodes: Array<SynthNode> = [sampler, envelope, panner];
      if (ampFactor !== 1.0) {
        let gain = new Gain(ctx, { gain: ampFactor });
        panner.connect({ synthNode: gain, audioNode: null });
        nodes.push(gain);
      }

      return {
        scoreEvent,
        started: false,
        nodes,
      };
    }

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

      console.log(
        'Removing indexes',
        indexes,
        'from list',
        getIdsForPlayEvents(list)
      );
      indexes.forEach((index) => list.splice(index, 1));
      console.log('playEvents after removal', getIdsForPlayEvents(list));
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
        synthNode: mainOutNode,
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

  function getEnvelopeLengthForScoreEvent(
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
    console.log('Fading', playEvent.scoreEvent.rate);
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

function updatePlayEventNodeParams(tickLength: number, playEvent: PlayEvent) {
  var samplerNode = playEvent.nodes.find((node) => node instanceof Sampler);
  if (samplerNode) {
    samplerNode.params.playbackRate = playEvent.scoreEvent.rate;
    samplerNode.syncToParams();
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
