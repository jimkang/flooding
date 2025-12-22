import { getTonalityDiamond } from './tonality-diamond';
import { range } from 'd3-array';

export const defaultSecondsPerTick = 15;
export const diamondLimit = 11;

const denomLimit = 32;
const tolerance = 1 / 10000;

export var tonalityDiamondPitches = getTonalityDiamond({ diamondLimit }).sort(
  compareDenomSizeAsc
);

export var sampleFilenames = [
  '1921-1930.wav',
  '1931-1940.wav',
  '1941-1950.wav',
  '1951-1960.wav',
  '1961-1970.wav',
  '1971-1980.wav',
  '1981-1990.wav',
  '1991-2000.wav',
  '2001-2010.wav',
  '2011-2020.wav',
  '2021.wav',
  'trumpet-D2.wav',
  'flute-G4-edit.wav',
  'glass-more-full.wav',
  'glass-less-full.wav',
  'Marimba-D3.wav',
  'trumpet-D2-eqd.wav',
  'echoey-impulse.wav',
  'marimba-d3-long.wav',
  'french-horn-D2.wav',
  'spacey-impulse.wav',
  'celesta-g4-soft-PB.wav',
  'cor_anglais-d4-PB-loop.wav',
  'chorus-male-d3-PB-loop.wav',
  'Vibraphone.sustain.ff.D3.wav',
  'RoboRhode-D2.wav',
  'PianoRoomWide-D2.wav',
  'PianoSoftRoll-D2.wav',
  '205822__xserra__organ-c3-fade-out.wav',
  'organ-d2.wav',
  'vibraphone-mellower-d3.wav',
  '2_D-PB.wav',
  '2_D-PB-fade-out.wav',
];
export var defaultADSRCurve = [
  0, 0.5, 1, 1, 1, 1, 0.95, 0.9, 0.8, 0.72, 0.6, 0.3, 0.1, 0,
];
export var flatADSR = [1.0, 1.0];
export var secondHalfFadeOutCurve = [1, 1, 1, 1, 1, 0.8, 0.5, 0.25, 0.1, 0];
export var fadeOutCurve = [1, 0.8, 0.5, 0.25, 0.1, 0];
export var fastInOutCurve = [0, 0.5]
  .concat(range(100).map(() => 1))
  .concat([0.95, 0.9, 0.8, 0.72, 0.6, 0.3, 0.1, 0]);
export const minFadeSeconds = 1;

function compareDenomSizeAsc(a, b) {
  if (getDenom(a) < getDenom(b)) {
    return -1;
  }
  return 1;
}

function getDenom(n) {
  for (let denom = 1; denom < denomLimit; ++denom) {
    if (n % (1 / denom) <= tolerance) {
      return denom;
    }
  }
  return denomLimit;
}
