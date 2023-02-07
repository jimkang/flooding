import { Gain } from '../synths/synth-node';

export function MainOut({ ctx, totalSeconds }) {
  // Every playEvent should go out through this node eventually.
  var mainOutNode = new Gain(ctx, { gain: 1.0 });
  // Linear ramp on gain?
  //var compressor = new DynamicsCompressorNode(ctx, {
  //threshold: -16,
  //ratio: 12,
  //});
  //compressor.ratio.exponentialRampToValueAtTime(2, totalSeconds);
  //compressor.ratio.linearRampToValueAtTime(1, totalSeconds);
  //mainOutNode.connect({ synthNode: null, audioNode: compressor });
  mainOutNode.connect({ synthNode: null, audioNode: ctx.destination });
  //compressor.connect(ctx.destination);
  return mainOutNode;
}
