import RouteState from 'route-state';
import handleError from 'handle-error-web';
import { version } from './package.json';
import ep from 'errorback-promise';
import ContextKeeper from 'audio-context-singleton';
//import { queue } from 'd3-queue';
import wireControls from './renderers/wire-controls';
import { Ticker } from './updaters/ticker';
import { SampleDownloader } from './tasks/sample-downloader';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import { ChordPlayer } from './updaters/chord-player';
import { getChord } from './updaters/get-chord';
import { renderDensityCanvas } from './renderers/render-density-canvas';
import { range } from 'd3-array';
import { tonalityDiamondPitches } from './tonality-diamond';
import { defaultTotalTicks, defaultSecondsPerTick } from './consts';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var prob;
var chordPlayer;
var pastDensityOverTimeArrays = [];
const densityHistoryLimit = 200;

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  routeState = RouteState({
    followRoute,
    windowObject: window,
  });
  routeState.routeFromHash();
})();

async function followRoute({ seed, totalTicks = defaultTotalTicks, secondsPerTick = defaultSecondsPerTick }) {
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

  var densityOverTimeArray = range(800).map(() => 0);
  if (localStorage.densityOverTimeArray) {
    console.log(JSON.parse(localStorage.densityOverTimeArray));
    densityOverTimeArray = JSON.parse(localStorage.densityOverTimeArray);
  }

  var random = seedrandom(seed);
  prob = Probable({ random });
  prob.roll(2);

  ticker = new Ticker({
    onTick,
    secondsPerTick,
    startTicks: 0,
    totalTicks
  }); 

  sampleDownloader = SampleDownloader({
    sampleFiles: ['bagpipe-c.wav', 'flute-G4-edit.wav', 'trumpet-D2.wav'],
    localMode: true,
    onComplete,
    handleError
  });
  sampleDownloader.startDownloads();

  renderDensityCanvas({
    densityOverTimeArray,
    densityMax: tonalityDiamondPitches.length,
    onChange
  });

  function onChange(newDensityOverTimeArray) {
    pastDensityOverTimeArrays.push(newDensityOverTimeArray);
    if (pastDensityOverTimeArrays.length > densityHistoryLimit) {
      pastDensityOverTimeArrays.shift();
    }
    localStorage.setItem('densityOverTimeArray', JSON.stringify(densityOverTimeArray));
  }

  // TODO: Test non-locally.
  function onComplete({ buffers }) {
    console.log(buffers);
    chordPlayer = ChordPlayer({ ctx, sampleBuffer: buffers[2] });
    wireControls({ onStart, onUndo, onPieceLengthChange, onTickLengthChange, totalTicks, secondsPerTick });
  }

  function onTick({ ticks, currentTickLengthSeconds }) {
    console.log(ticks, currentTickLengthSeconds); 
    chordPlayer.play(Object.assign({ currentTickLengthSeconds }, getChord({ ticks, probable: prob, densityOverTimeArray, totalTicks })));
  }

  function onUndo() {
    // TODO: Avoid "going back" to the most recent change, which is sort
    // of not undoing at all.
    var prevDensityOverTimeArray = pastDensityOverTimeArrays.pop();
    if (prevDensityOverTimeArray) {
      densityOverTimeArray = prevDensityOverTimeArray;
      renderDensityCanvas({
        densityOverTimeArray,
        densityMax: tonalityDiamondPitches.length,
        onChange
      });
    }
  }

  function onPieceLengthChange(length) {
    routeState.addToRoute({ totalTicks: length });
  }

  function onTickLengthChange(length) {
    routeState.addToRoute({ secondsPerTick: length });
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

