import { Gain, Reverb } from 'synthskel/synths/synth-node';
import { goodlog } from './goodlog';

export function ReverbMixer(ctx, { impulseBuffer, wetGain, dryGain }) {
  var inNode = new Gain(ctx, { gain: 1.0 });
  var outNode = new Gain(ctx, { gain: 1.0 });

  var wetNode = new Gain(ctx, { gain: wetGain });

  if (impulseBuffer) {
    let reverb = new Reverb(ctx, { buffer: impulseBuffer });
    inNode.connect({ synthNode: reverb });
    reverb.connect({ synthNode: wetNode });
  } else {
    inNode.connect({ synthNode: wetNode });
  }

  var dryNode = new Gain(ctx, { gain: dryGain });
  inNode.connect({ synthNode: dryNode });

  wetNode.connect({ synthNode: outNode });
  dryNode.connect({ synthNode: outNode });

  return {
    inNode,
    outNode,
    wetNode,
    dryNode,
    setWetDryMix,
  };

  function setWetDryMix(mix) {
    goodlog('Reverb mix:', mix);
    wetNode.params.gain = mix;
    dryNode.params.gain = 1 - mix;
    wetNode.syncToParams();
    dryNode.syncToParams();
  }
}
