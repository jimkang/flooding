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

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var prob;
var chordPlayer;

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  routeState = RouteState({
    followRoute,
    windowObject: window,
  });
  routeState.routeFromHash();
})();

async function followRoute({ seed }) {
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
  console.log(ctx);

  var random = seedrandom(seed);
  prob = Probable({ random });
  prob.roll(2);

  ticker = new Ticker({
    onTick,
    secondsPerCompactUnit: 1,
    ticksPerCompactUnit: 1,
    startTicks: 0,
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
    wireControls({ onStart });
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

function onTick({ ticks, currentTickLengthSeconds }) {
  console.log(ticks, currentTickLengthSeconds); 
  chordPlayer.play(Object.assign({ currentTickLengthSeconds }, getChord({ ticks })));
}

