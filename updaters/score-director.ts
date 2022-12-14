import { Sampler, Envelope, Panner, SynthNode } from '../synths/synth-node';
import { ScoreState, ScoreEvent, PlayEvent } from '../types';
import DataJoiner from 'data-joiner';
import curry from 'lodash.curry';

function idScoreEvent(scoreEvent: ScoreEvent) {
  return scoreEvent.rate.toFixed(3);
}

export function ScoreDirector({ ctx, sampleBuffer }) {
  var scoreEventJoiner = DataJoiner({
    keyFn: idScoreEvent
  });
  var playEvents: PlayEvent[] = [];

  return { play };

  function play(state: ScoreState) {
    scoreEventJoiner.update(state.events);
    var exitingScoreEvents = scoreEventJoiner.exit();
    console.log('exitingScoreEvents', exitingScoreEvents.map(e => e.rate));
    var exitingPlayEvents = exitingScoreEvents.map(existingPlayEventForScoreEvent);
    if (exitingPlayEvents.some(e => !e.started)) {
      debugger;
    }
    exitingPlayEvents.forEach(removePlayEventFromList);
    exitingPlayEvents.forEach(curry(fadeToDeath)(state.tickLength/4));

    var newScoreEvents = scoreEventJoiner.enter();
    console.log('newScoreEvents', newScoreEvents.map(e => e.rate));
    var newPlayEvents = newScoreEvents.map(curry(newPlayEventForScoreEvent)(state.events.length));
    playEvents = playEvents.concat(newPlayEvents);
    newPlayEvents.forEach(
      playEvent => connectLastToDest(playEvent.nodes)
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );

    const baseStartTime = ctx.currentTime;
    // TODO: parameterize start and end times.
    newPlayEvents.forEach(playPlayEvent);
    console.log('current scoreEvents', state.events.map(e => e.rate));
    state.events.map(existingPlayEventForScoreEvent).forEach(updatePlayEventNodeParams);

    function playPlayEvent(playEvent: PlayEvent) {
      console.log('Playing', playEvent.scoreEvent.rate);
      const startTime = baseStartTime + playEvent.scoreEvent.delay;
      //const endTime = startTime + state.tickLength;
      playEvent.nodes.forEach(synth => synth.play({ startTime, endTime: NaN }));
      playEvent.started = true;
    }

    function newPlayEventForScoreEvent(totalScoreEventCount: number, scoreEvent: ScoreEvent): PlayEvent {
      var sampler = new Sampler(
        ctx,
        {      
          sampleBuffer,
          playbackRate: scoreEvent.rate,
          loop: true,
          loopStart: 0.1,
          loopEnd: 2.5,
          timeNeededForEnvelopeDecay: state.tickLength
        }
      );
      const maxGain = 0.8/Math.pow(totalScoreEventCount, 3);
      var envelope = new Envelope(
        ctx,
        { envelopeMaxGain: maxGain, envelopeLengthProportionToEvent: 1.2 }
      );
      var panner = new Panner(ctx, { pan: scoreEvent.pan });

      sampler.connect({ synthNode: envelope, audioNode: null });
      envelope.connect({ synthNode: panner, audioNode: null });

      return {
        scoreEvent,
        nodes: [sampler, envelope, panner],
        started: false
      };
    }

    function existingPlayEventForScoreEvent(scoreEvent: ScoreEvent): PlayEvent {
      const id = idScoreEvent(scoreEvent);
      return playEvents.find(playEvent => idScoreEvent(playEvent.scoreEvent) === id);
    }

    function removePlayEventFromList(playEvent: PlayEvent) {
      const id = idScoreEvent(playEvent.scoreEvent);
      const index = playEvents.findIndex(e => idScoreEvent(e.scoreEvent) === id);
      if (index < 0) {
        throw new Error(`Could not find ${id} in playEvents for deletion.`);
      }
      playEvents.splice(index, 1);
    }
  }

  //function detuneToSamplerChain(detune, i, detunes) {
  //var sampler = new Sampler(ctx, { sampleBuffer, sampleDetune: detune, timeNeededForEnvelopeDecay: 0 });
  //var gain = new Gain(ctx, { gain: 1.0/detunes.length });  
  //sampler.connect({ synthNode: gain });
  //return [sampler, gain];
  //}

  function connectLastToDest(chain: SynthNode[]) {
    // TODO: Connect to limiter instead.
    if (chain.length > 0) {
      chain[chain.length - 1].connect({ synthNode: null, audioNode: ctx.destination });
    }
  }
}

function fadeToDeath(fadeSeconds: number, playEvent: PlayEvent) {
  console.log('Fading', playEvent.scoreEvent.rate);
  var envelopeNode: Envelope = playEvent.nodes.find(node => node instanceof Envelope) as Envelope;
  if (!envelopeNode) {
    throw new Error("Can't fade this. It's missing a Envelope synth node!");
  }
  envelopeNode.fadeOut(fadeSeconds);
  setTimeout(() => decommisionNodes(playEvent), fadeSeconds * 1000);
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

function updatePlayEventNodeParams(playEvent: PlayEvent) {
  var samplerNode = playEvent.nodes.find(node => node instanceof Sampler);
  if (samplerNode) {
    samplerNode.params.playbackRate = playEvent.scoreEvent.rate;
    samplerNode.syncToParams();
  }
  var pannerNode = playEvent.nodes.find(node => node instanceof Panner);
  if (pannerNode) {
    pannerNode.params.pan = playEvent.scoreEvent.pan;
    pannerNode.syncToParams();
  }
}
