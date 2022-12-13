import { Sampler, Envelope, Panner, SynthNode } from '../synths/synth-node';
import { ScoreState, ScoreEvent, PlayEvent } from '../types';

export function ScoreDirector({ ctx, sampleBuffer }) {
  return { play };

  function play(state: ScoreState) {
    var playEvents = state.events.map(scoreEventToPlayEvent);
    playEvents.forEach(
      playEvent => connectLastToDest(playEvent.nodes)
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );
    const baseStartTime = ctx.currentTime;
    // TODO: parameterize start and end times.
    playEvents.forEach(playPlayEvent);

    function playPlayEvent(playEvent: PlayEvent) {
      const startTime = baseStartTime + playEvent.scoreEvent.delay;
      const endTime = startTime + state.tickLength;
      playEvent.nodes.forEach(synth => synth.play({ startTime, endTime }));
    }

    function scoreEventToPlayEvent(scoreEvent: ScoreEvent, i: number, scoreEvents: ScoreEvent[]): PlayEvent {
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
      const maxGain = 0.8/Math.pow(scoreEvents.length, 3);
      var envelope = new Envelope(
        ctx,
        { envelopeMaxGain: maxGain, envelopeLengthProportionToEvent: 1.2 }
      );
      var panner = new Panner(ctx, { pan: scoreEvent.pan });

      sampler.connect({ synthNode: envelope, audioNode: null });
      envelope.connect({ synthNode: panner, audioNode: null });

      return {
        scoreEvent,
        nodes: [sampler, envelope, panner]
      };
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

