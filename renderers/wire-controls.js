var { select } = require('d3-selection');

var OLPE = require('one-listener-per-element');
var startContainerSel = select('#start-container');

var { on } = OLPE();

function wireControls({ onStart }) {
  startContainerSel.attr('disable', false);
  on('#start-button', 'click', onStartClick);

  function onStartClick() {
    startContainerSel.classed('hidden', true);
    onStart();
  }
}

module.exports = wireControls;
