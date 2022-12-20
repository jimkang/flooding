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
import { ScoreDirector } from './updaters/score-director';
//import { Director } from './updaters/director';
import { DataComposer } from './updaters/data-composer';
import { defaultSecondsPerTick } from './consts';
import { preRunComposer } from './updaters/pre-run-composer';
import { RenderTimeSeries } from './renderers/render-time-series';
import { renderEventDirection } from './renderers/render-event-direction';
import { tonalityDiamondPitches } from './tonality-diamond';
//import biscayneTides from './data/biscayne-tides.json';
import bostonMSL from './data/rlr_monthly/json-data/235.json';
import { ScoreState } from './types';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var scoreDirector;
var renderDensity = RenderTimeSeries({
  canvasId: 'density-canvas', color: 'hsl(30, 50%, 50%)'
});
var renderTickLengths = RenderTimeSeries({
  canvasId: 'ticklength-canvas', color: 'hsl(50, 50%, 50%)'
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

async function followRoute({ seed, totalTicks, tempoFactor = defaultSecondsPerTick, startTick = 0, sampleIndex = 2 }) {
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
  var composer = DataComposer({
    tempoFactor,
    data: bostonMSL,
    chordProp: 'meanSeaLevelDeltaMM',
    chordXFloor: 6809,
    chordXCeil: 7387,
    seed
  });
  var scoreStateObjects: ScoreState[] = preRunComposer({ composer, totalTicks });
  console.log('Score states:');
  console.table(scoreStateObjects);
  const totalTime = scoreStateObjects.reduce(
    (total, direction) => total + direction.tickLength,
    0
  );
  console.log('totalTime in minutes', totalTime/60);
  console.log('Starting tick lengths', scoreStateObjects.slice(0, 8).map(d => d.tickLength));
  var firstBadEventDirection = scoreStateObjects.find(state => !state.events.some(e => !e.delay)|| state.tickLength <= 0);
  if (firstBadEventDirection) {
    throw new Error(`Event direction is bad: ${JSON.stringify(firstBadEventDirection, null, 2)}`);
  }

  ticker = Ticker({
    onTick,
    startTick,
    getTickLength,
    totalTicks,
    onPause: null,
    onResume: null
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
    scoreDirector = ScoreDirector({ ctx, sampleBuffer: buffers[sampleIndex] });
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
    var scoreState = scoreStateObjects[ticks];
    var tickLength = currentTickLengthSeconds;
    if (!isNaN(scoreState.tickLength)) {
      tickLength = scoreState.tickLength;
    }
    renderEventDirection({
      tickIndex: ticks,
      tickLength,
      chordSize: scoreState.meta.chordPitchCount
    });

    renderDensity({
      valueOverTimeArray: scoreStateObjects.map(({ tickLength, meta }) => ({ time: tickLength, value: meta.chordPitchCount })),
      totalTime,
      valueMax: tonalityDiamondPitches.length,
      currentTick: ticks
    }); 

    renderTickLengths({
      valueOverTimeArray: scoreStateObjects.map(({ tickLength }) => ({ time: 1, value: tickLength })),
      totalTime: scoreStateObjects.length,
      valueMax: scoreStateObjects.reduce(
        (max, direction) => direction.tickLength > max ? direction.tickLength : max,
        0
      ),
      currentTick: ticks
    }); 

    scoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, scoreState)
    );
  }

  function getTickLength(ticks) {
    if (ticks < scoreStateObjects.length) {
      var tickLength = scoreStateObjects[ticks].tickLength;
      if (!isNaN(tickLength)) {
        return tickLength;
      }
    }
    //return director.getTickLength(ticks);
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

