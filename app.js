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
//import { Director } from './updaters/director';
import { DataDirector } from './updaters/data-director';
import { defaultSecondsPerTick } from './consts';
import { preRunDirector } from './updaters/pre-run-director';
import { RenderTimeSeries } from './renderers/render-time-series/';
import { renderEventDirection } from './renderers/render-event-direction';
import { tonalityDiamondPitches } from './tonality-diamond';
//import biscayneTides from './data/biscayne-tides.json';
import bostonMSL from './data/rlr_monthly/json-data/235.json';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var chordPlayer;
var renderDensity = RenderTimeSeries({
  canvasId: 'density-canvas', color: 'hsl(30, 50%, 50%)'
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
async function followRoute({ seed, totalTicks, tempoFactor = defaultSecondsPerTick }) {
  if (!seed) {
    routeState.addToRoute({ seed: randomId(8) });
    return;
  }
  if (!totalTicks) {
    routeState.addToRoute({ totalTicks: bostonMSL.length});
    return;
  }

  // TODO: This whole context getting thing is too unwieldy.
  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }

  var ctx = values[0];
  
  //var director = Director({ seed, tempoFactor });
  var director = DataDirector({
    tempoFactor,
    data: bostonMSL,
    chordProp: 'meanSeaLevelDeltaMM',
    chordXFloor: 6809,
    chordXCeil: 7387
  });
  var eventDirectionObjects = preRunDirector({ director, totalTicks });
  console.table('eventDirectionObjects', eventDirectionObjects);
  const totalTime = eventDirectionObjects.reduce(
    (total, direction) => total + direction.tickLength,
    0
  );
  console.log('totalTime', totalTime);

  ticker = new Ticker({
    onTick,
    startTicks: 0,
    getTickLength,
    totalTicks
  }); 

  sampleDownloader = SampleDownloader({
    sampleFiles: ['bagpipe-c.wav', 'flute-G4-edit.wav', 'trumpet-D2.wav', 'Vibraphone.sustain.ff.D4.wav'],
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
    //var chord = director.getChord({ ticks });
    var eventDirection = eventDirectionObjects[ticks];
    var tickLength = currentTickLengthSeconds;
    if (!isNaN(eventDirection.tickLength)) {
      tickLength = eventDirection.tickLength;
    }
    renderEventDirection({
      tickIndex: ticks,
      tickLength,
      chordSize: eventDirection.chord.rates.length
    });

    renderDensity({
      valueOverTimeArray: eventDirectionObjects.map(({ tickLength, chordSize }) => ({ time: tickLength, value: chordSize })),
      totalTime,
      valueMax: tonalityDiamondPitches.length,
      currentTick: ticks
    }); 

    chordPlayer.play(
      Object.assign({ tickLengthSeconds: tickLength }, eventDirection.chord)
    );
  }

  function getTickLength(ticks) {
    if (ticks < eventDirectionObjects.length) {
      var tickLength = eventDirectionObjects[ticks].tickLength;
      if (!isNaN(tickLength)) {
        return tickLength;
      }
    }
    return director.getTickLength(ticks);
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

