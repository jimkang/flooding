import { SynthNode } from './synths/synth-node';

export interface ScoreState {
  events: ScoreEvent[];
  tickIndex: number;
  tickLength: number;
  meta?: EventMetadata;
}

export interface ScoreEvent {
  rate: number;
  delay: number;
  pan?: number;
}

export interface EventMetadata {
  chordPitchCount?: number;
}

export interface PlayEvent {
  scoreEvent: ScoreEvent;
  nodes: SynthNode[];
  started: boolean;
}
