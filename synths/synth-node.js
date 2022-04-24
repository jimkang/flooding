//var SoundbankReverb = require('soundbank-reverb');

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
    const peakTime = this.params.peakTimeProportion * (endTime - startTime);
    this.node.gain.value = 0;
    this.node.gain.exponentialRampToValueAtTime(
      this.params.envelopeMaxGain,
      peakTime,
    );
    // How do I start it at peakTime? AudioParam.setValueCurveAtTime()
    this.node.gain.exponentialRampToValueAtTime(
      0,
      endTime
    );
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
    }
  }
  play({ startTime, endTime }) {
    this.node.start(startTime);
    this.node.stop(endTime + this.params.timeNeededForEnvelopeDecay);
  }
}

