var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');

var { on } = OLPE();
var pieceLengthInput = document.getElementById('piece-length-field');
var secondsPerTickInput = document.getElementById('tick-length-field');

function wireControls({
  onStart,
  onUndoDensity,
  onUndoTempo,
  onPieceLengthChange,
  onTickLengthChange,
  totalTicks,
  secondsPerTick }) {

  pieceLengthInput.value = totalTicks;
  secondsPerTickInput.value = secondsPerTick;

  select('#start-button').attr('disabled', null);
  on('#start-button', 'click', onStartClick);
  on('#undo-density-button', 'click', onUndoDensityClick);
  on('#undo-tempo-button', 'click', onUndoTempoClick);
  on('#piece-length-field', 'change', onPieceLengthFieldChange);
  on('#tick-length-field', 'change', onTickLengthFieldChange);

  function onStartClick() {
    onStart();
  }

  function onUndoDensityClick() {
    onUndoDensity();
  }

  function onUndoTempoClick() {
    onUndoTempo();
  }

  function onPieceLengthFieldChange() {
    onPieceLengthChange(+pieceLengthInput.value);
  }

  function onTickLengthFieldChange() {
    onTickLengthChange(+secondsPerTickInput.value);
  }
}

module.exports = wireControls;
