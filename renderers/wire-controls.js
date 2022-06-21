var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');

var { on } = OLPE();

function wireControls({ onStart }) {
  select('#start-button').attr('disabled', null);
  on('#start-button', 'click', onStartClick);

  function onStartClick() {
    onStart();
  }
}

module.exports = wireControls;
