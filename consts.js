import { getTonalityDiamond } from './tonality-diamond';
export const defaultSecondsPerTick = 0.5;
export const diamondLimit = 13;
export var tonalityDiamondPitches = getTonalityDiamond({ diamondLimit });
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
  'flute_note_tremolo.wav',
  'flute-G4-edit.wav',
  'glass-more-full.wav',
  'glass-less-full.wav',
];
export var defaultADSRCurve = [
  0, 0.5, 1, 1, 1, 1, 0.95, 0.9, 0.8, 0.72, 0.6, 0.3, 0.1, 0,
];
