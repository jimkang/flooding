var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');

var { on } = OLPE();

function wireControls({ onStart, onUndo }) {
  select('#start-button').attr('disabled', null);
  on('#start-button', 'click', onStartClick);
  on('#undo-button', 'click', onUndoClick);

  function onStartClick() {
    onStart();
  }

  function onUndoClick() {
    onUndo();
  }
}

module.exports = wireControls;
