import RouteState from 'route-state';
import handleError from 'handle-error-web';
import { version } from './package.json';
import ep from 'errorback-promise';
import ContextKeeper from 'audio-context-singleton';
//import { queue } from 'd3-queue';
import wireControls from './renderers/wire-controls';
import { Ticker } from './updaters/ticker';
import { SampleDownloader } from './tasks/sample-downloader';
import RandomId from '@jimkang/randomid';
import { ChordPlayer } from './updaters/chord-player';
import { Director } from './updaters/director';
import { defaultTotalTicks, defaultSecondsPerTick } from './consts';
import { preRunDirector } from './updaters/pre-run-director';
import { RenderDensityOverTime } from './renderers/render-density-over-time';
import { renderEventDirection } from './renderers/render-event-direction';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var chordPlayer;
var renderDensityOverTime = RenderDensityOverTime({
  canvasId: 'density-canvas', color: 'hsl(60, 50%, 50%)'
});

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  routeState = RouteState({
    followRoute,
    windowObject: window,
  });
  routeState.routeFromHash();
})();

// TODO: Add "Too uncomfortable"/"too comfortable" controls.
async function followRoute({ seed, totalTicks = defaultTotalTicks, tempoFactor = defaultSecondsPerTick }) {
  if (!seed) {
    routeState.addToRoute({ seed: randomId(8) });
    return;
  }

  // TODO: This whole context getting thing is too unwieldy.
  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }

  var ctx = values[0];
  var director = Director({ seed, tempoFactor });
  var eventDirectionObjects = preRunDirector({ director, totalTicks });
  console.table('eventDirectionObjects', eventDirectionObjects);
  renderDensityOverTime({ eventDirectionObjects }); 

  ticker = new Ticker({
    onTick,
    startTicks: 0,
    getTickLength: director.getTickLength,
    totalTicks
  }); 

  sampleDownloader = SampleDownloader({
    sampleFiles: ['bagpipe-c.wav', 'flute-G4-edit.wav', 'trumpet-D2.wav'],
    localMode: true,
    onComplete,
    handleError
  });
  sampleDownloader.startDownloads();

  // TODO: Test non-locally.
  function onComplete({ buffers }) {
    console.log(buffers);
    chordPlayer = ChordPlayer({ ctx, sampleBuffer: buffers[2] });
    wireControls({
      onStart,
      onPieceLengthChange,
      onTempoFactorChange,
      totalTicks,
      tempoFactor
    });
  }

  function onTick({ ticks, currentTickLengthSeconds }) {
    console.log(ticks, currentTickLengthSeconds); 
    var chord = director.getChord({ ticks });
    renderEventDirection({
      tickIndex: ticks,
      tickLength: currentTickLengthSeconds,
      chordSize: chord.rates.length
    });
    chordPlayer.play(Object.assign({ currentTickLengthSeconds }, chord));
  }

  function onPieceLengthChange(length) {
    routeState.addToRoute({ totalTicks: length });
  }

  function onTempoFactorChange(length) {
    routeState.addToRoute({ tempoFactor: length });
  }
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info');
  versionInfo.textContent = version;
}

// Responders

function onStart() {
  ticker.resume();
}

