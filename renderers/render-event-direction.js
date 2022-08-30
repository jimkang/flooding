var currentTickField = document.getElementById('current-tick-field');
var currentTickLengthField = document.getElementById('current-tick-length-field');
var currentChordSizeField = document.getElementById('current-chord-size-field');

export function renderEventDirection({ tickIndex, tickLength, chordSize }) {
  currentTickField.textContent = tickIndex;
  currentTickLengthField.textContent = tickLength;
  currentChordSizeField.textContent = chordSize;
}
