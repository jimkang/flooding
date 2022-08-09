var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');

var { on } = OLPE();
var pieceLengthInput = document.getElementById('piece-length-field');
var tempoFactorInput = document.getElementById('tempo-factor-field');

function wireControls({
  onStart,
  onUndoDensity,
  onUndoTempo,
  onPieceLengthChange,
  onTempoFactorChange,
  totalTicks,
  tempoFactor }) {

  pieceLengthInput.value = totalTicks;
  tempoFactorInput.value = tempoFactor;

  select('#start-button').attr('disabled', null);
  on('#start-button', 'click', onStartClick);
  on('#undo-density-button', 'click', onUndoDensityClick);
  on('#undo-tempo-button', 'click', onUndoTempoClick);
  on('#piece-length-field', 'change', onPieceLengthFieldChange);
  on('#tempo-factor-field', 'change', onTempoFactorFieldChange);

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

  function onTempoFactorFieldChange() {
    onTempoFactorChange(+tempoFactorInput.value);
  }
}

module.exports = wireControls;
