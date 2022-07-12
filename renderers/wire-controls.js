var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');

var { on } = OLPE();
var pieceLengthInput = document.getElementById('piece-length-field');

function wireControls({ onStart, onUndo, onPieceLengthChange, totalTicks }) {
  pieceLengthInput.value = totalTicks;

  select('#start-button').attr('disabled', null);
  on('#start-button', 'click', onStartClick);
  on('#undo-button', 'click', onUndoClick);
  on('#piece-length-field', 'change', onPieceLengthFieldChange);

  function onStartClick() {
    onStart();
  }

  function onUndoClick() {
    onUndo();
  }

  function onPieceLengthFieldChange() {
    onPieceLengthChange(+pieceLengthInput.value);
  }
}

module.exports = wireControls;
