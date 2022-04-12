import { Sampler, Envelope } from '../synths/synth-node';
import { timeNeededForEnvelopeDecay, envelopePeakRateK, envelopeDecayRateK } from '../consts';

export function ChordPlayer({ ctx, sampleBuffer }) {
  return { play };

  function play({ rates, currentTickLengthSeconds }) {
    var samplerChains = rates.map(rateToSamplerChain);
    samplerChains.forEach(
      connectLastToDest
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );
    // TODO: parameterize start and end times.
    samplerChains.forEach(chain => playSampler(chain[0]));

    function playSampler(sampler) {
      const startTime = ctx.currentTime + 0;
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
    const maxGain = 1.0/rates.length;
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

