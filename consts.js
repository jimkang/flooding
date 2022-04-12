export const bigTempoWaveAmp = 0.15;
export const densificationPeriod = 30;
export const totalTicks = densificationPeriod;
export const timeNeededForEnvelopeDecay = 2.0;

// At about 60 bpm, the 16-beat riff takes up about a
// quarter of a minute.

export var startingIntervals = [
  1, // root
  2, // octave
  1.5, // fifth
  4 / 3, // fourth
  1.25, // major third
  6 / 5, // minor third
  9 / 8, // major second
  16 / 9, // minor seventh
  27 / 16, // major sixth
  128 / 81, // minor sixth
  243 / 128, // major seventh
  256 / 243, // minor second
  729 / 512, // tritone!
];
