import { SynthNode } from './synths/synth-node';

export interface ScoreState {
  events: ScoreEvent[];
  tickIndex: number;
  // Tick length is how long until the next state starts.
  tickLength: number;
  // Duration ticks is how many ticks it takes for the sounds from this state to fade.
  durationTicks?: number;
  meta?: EventMetadata;
}

export interface Loop {
  loopStartSeconds: number;
  loopEndSeconds: number;
}

export interface ScoreEvent {
  rate: number;
  delay: number;
  peakGain: number;
  pan?: number;
  fadeLength?: number;

  // By default, it is assumed that ScoreEvent will always be using the same sample.
  // variableSampleIndex allows the specification of different samples per event.
  variableSampleIndex?: number;
  loop?: Loop;
  meta?: EventMetadata;
  rest?: boolean;
  absoluteLengthSeconds?: number;
}

export interface EventMetadata {
  chordPitchCount?: number;
  sourceDatum?;
}

export interface PlayEvent {
  scoreEvent: ScoreEvent;
  nodes: SynthNode[];
  started: boolean;
  rest?: boolean;
}
