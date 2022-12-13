//var SoundbankReverb = require('soundbank-reverb');

var adsrCurve = new Float32Array([
  0,
  0.5,
  1,
  1,
  1,
  1,
  0.95,
  0.9,
  0.8,
  0.72,
  0.6,
  0.3,
  0.1,
  0
]);

export class SynthNode {
  constructor(ctx, params) {
    this.ctx = ctx;
    this.params = params;
    this.node = null;
  }
  node() {
    return this.node;
  }
  connect({ synthNode, audioNode }) {
    if (audioNode) {
      this.node.connect(audioNode);
    } else if (synthNode) {
      this.node.connect(synthNode.node);
    } else {
      throw new Error('No synthNode or raw AudioNode passed to connect.');
    }
  }
  play({ startTime, endTime }) {
    try {
      this.node.start(startTime);
      if (!isNaN(endTime)) {
        this.node.stop(endTime);
      }
    } catch (e) {
      console.log(e);
    }
  }
}

export class VibratoGenerator extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createOscillator();
    this.node.frequency.value = this.params.rateFreq;
  }
}

export class VibratoAmp extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
    this.node.gain.value = this.params.pitchVariance;
  }
  connect({ synthNode, audioNode }) {
    var connectTargetNode = audioNode || synthNode.node;
    var connectTarget = connectTargetNode[this.params.destProp || 'detune'];
    this.node.connect(connectTarget);
  }
  play() {}
}

export class Gain extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
    this.node.gain.value = this.params.gain;
  }
  play() {}
}

export class Envelope extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
  }
  play({ startTime, endTime }) {
    this.node.gain.value = 0;
    var envelopeLength = endTime - startTime;
    if (this.params.envelopeLengthProportionToEvent) {
      envelopeLength *= this.params.envelopeLengthProportionToEvent;
    }
    this.node.gain.setValueCurveAtTime(adsrCurve, startTime, envelopeLength);
  }
}

//export class Reverb extends SynthNode {
//constructor(ctx, params) {
//super(ctx, params);
//this.node = this.ctx.createGain();
//this.node = SoundbankReverb(ctx);
//this.node.time = this.params.reverbSeconds;
//this.node.wet.value = this.params.reverbWet;
//this.node.dry.value = this.params.reverbDry;
//}
//play() {}
//}

export class Compressor extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createDynamicsCompressor();
  }
  play({ startTime }) {
    this.node.threshold.setValueAtTime(
      this.params.compressorThreshold,
      startTime
    );
    this.node.knee.setValueAtTime(this.params.compressorKnee, startTime);
    this.node.ratio.setValueAtTime(this.params.compressorRatio, startTime);
    this.node.attack.setValueAtTime(this.params.compressorAttack, startTime);
    this.node.release.setValueAtTime(this.params.compressorRelease, startTime);
  }
}

export class Sampler extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createBufferSource();
    this.node.buffer = params.sampleBuffer;
    if (params.sampleDetune) {
      this.node.detune.value = params.sampleDetune;
    }
    if (params.playbackRate) {
      this.node.playbackRate.value = params.playbackRate;
    }
    if (params.loop) {
      this.node.loop = params.loop;
      this.node.loopStart = params.loopStart;
      this.node.loopEnd = params.loopEnd;
    }
  }
  play({ startTime, endTime }) {
    this.node.start(startTime);
    this.node.stop(endTime + this.params.timeNeededForEnvelopeDecay);
  }
}

export class Panner extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createStereoPanner(this.ctx, { pan: params.pan });
  }
  play() {}
}


