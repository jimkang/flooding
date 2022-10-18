import { Sampler, Envelope } from '../synths/synth-node';

export function ChordPlayer({ ctx, sampleBuffer }) {
  return { play };

  function play({ rates, delays, currentTickLengthSeconds }) {
    var samplerChains = rates.map(rateToSamplerChain);
    samplerChains.forEach(
      connectLastToDest
      //chain => chain?[chain.length - 1]?.connect({ audioNode: ctx.destination }
    );
    const baseStartTime = ctx.currentTime;
    // TODO: parameterize start and end times.
    samplerChains.forEach((chain, i) => playSampler(chain[0], delays[i]));

    function playSampler(sampler, delay) {
      const startTime = baseStartTime  + delay;
      const endTime = startTime + currentTickLengthSeconds;
      sampler.play({ startTime, endTime });
    }

    function rateToSamplerChain(rate, i, rates) {
      var sampler = new Sampler(
        ctx,
        {      
          sampleBuffer,
          playbackRate: rate,
          loop: false,
          timeNeededForEnvelopeDecay: currentTickLengthSeconds
        }
      );
      const maxGain = 0.8/Math.pow(rates.length, 3);
      var envelope = new Envelope(ctx, { envelopeMaxGain: maxGain, peakTimeProportion: 0.1 });
      sampler.connect({ synthNode: envelope });
      return [sampler, envelope];
    }
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

