import { Sampler, Envelope } from '../synths/synth-node';
import { timeNeededForEnvelopeDecay } from '../consts';

export function ChordPlayer({ ctx, sampleBuffer }) {
  return { play };

  function play({ rates, delays, currentTickLengthSeconds }) {
    var samplerChains = rates.map(rateToSamplerChain);
    samplerChains.forEach(
      connectLastToDest
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );
    // TODO: parameterize start and end times.
    samplerChains.forEach((chain, i) => playSampler(chain[0], delays[i]));

    function playSampler(sampler, delay) {
      // TODO: This should be connected to the tick length.
      const startTime = ctx.currentTime + delay;
      const endTime = startTime + currentTickLengthSeconds;
      sampler.play({ startTime, endTime });
    }
  }

  function rateToSamplerChain(rate, i, rates) {
    var sampler = new Sampler(
      ctx,
      {      
        sampleBuffer,
        playbackRate: rate,
        loop: true,
        timeNeededForEnvelopeDecay 
      }
    );
    const maxGain = 0.8/Math.pow(rates.length, 3);
    var envelope = new Envelope(ctx, { envelopeMaxGain: maxGain });
    sampler.connect({ synthNode: envelope });
    return [sampler, envelope];
  }

  //function detuneToSamplerChain(detune, i, detunes) {
  //var sampler = new Sampler(ctx, { sampleBuffer, sampleDetune: detune, timeNeededForEnvelopeDecay: 0 });
  //var gain = new Gain(ctx, { gain: 1.0/detunes.length });  
  //sampler.connect({ synthNode: gain });
  //return [sampler, gain];
  //}

  function connectLastToDest(chain) {
    // TODO: Connect to limiter instead.
    if (chain.length > 0) {
      chain[chain.length - 1].connect({ audioNode: ctx.destination });
    }
  }
}

