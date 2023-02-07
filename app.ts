import RouteState from 'route-state';
import handleError from 'handle-error-web';
import { version } from './package.json';
import ep from 'errorback-promise';
import ContextKeeper from 'audio-context-singleton';
import wireControls from './renderers/wire-controls';
import { Ticker } from './updaters/ticker';
import { SampleDownloader } from './tasks/sample-downloader';
import RandomId from '@jimkang/randomid';
import { ScoreDirector } from './updaters/score-director';
import { DataComposer } from './updaters/data-composer';
import { defaultSecondsPerTick } from './consts';
import { preRunComposer } from './updaters/pre-run-composer';
import { RenderTimeSeries } from './renderers/render-time-series';
import { renderEventDirection } from './renderers/render-event-direction';
import { tonalityDiamondPitches } from './tonality-diamond';
import bostonMSL from './data/rlr_monthly/json-data/235.json';
import { ScoreState, ScoreEvent } from './types';
import { MainOut } from './updaters/main-out';
import { Transposer } from './updaters/transposer';
import { NarrationDataComposer } from './updaters/narration-data-composer';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var mainScoreDirector;
var lowScoreDirector;
var narrationDirector;

var renderDensity = RenderTimeSeries({
  canvasId: 'density-canvas',
  color: 'hsl(30, 50%, 50%)',
});
var renderTickLengths = RenderTimeSeries({
  canvasId: 'ticklength-canvas',
  color: 'hsl(50, 50%, 50%)',
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

async function followRoute({
  seed,
  totalTicks,
  tempoFactor = defaultSecondsPerTick,
  startTick = 0,
  sampleIndex = 11,
}) {
  if (!seed) {
    routeState.addToRoute({ seed: randomId(8) });
    return;
  }
  if (!totalTicks) {
    routeState.addToRoute({ totalTicks: bostonMSL.length });
    return;
  }

  // TODO: This whole context getting thing is too unwieldy.
  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }

  var ctx = values[0];

  var composer = DataComposer({
    tempoFactor,
    data: bostonMSL,
    chordProp: 'meanSeaLevelDeltaMM',
    chordXFloor: 6809,
    chordXCeil: 7387,
    seed,
  });
  var mainGroupScoreStateObjects: ScoreState[] = preRunComposer({
    composer,
    totalTicks,
  });
  const totalSeconds = mainGroupScoreStateObjects.reduce(
    (total, direction) => total + direction.tickLength,
    0
  );
  console.log('totalTime in minutes', totalSeconds / 60);
  console.log(
    'Starting tick lengths',
    mainGroupScoreStateObjects.slice(0, 8).map((d) => d.tickLength)
  );
  var firstBadEventDirection = mainGroupScoreStateObjects.find(
    (state) => !state.events.some((e) => !e.delay) || state.tickLength <= 0
  );
  if (firstBadEventDirection) {
    throw new Error(
      `Event direction is bad: ${JSON.stringify(
        firstBadEventDirection,
        null,
        2
      )}`
    );
  }

  var mainOutNode = MainOut({ ctx, totalSeconds });

  var lowTransposer = Transposer({
    seed,
    freqFactor: 0.5,
    eventProportionToTranspose: 0.5,
    sampleLoopStart: 0,
    sampleLoopEnd: 2,
  });
  var lowGroupScoreStateObjects: ScoreState[] = mainGroupScoreStateObjects.map(
    lowTransposer.getScoreState
  );

  var narrationComposer = NarrationDataComposer();
  var narrationGroupScoreStateObjects: ScoreState[] =
    mainGroupScoreStateObjects.map(narrationComposer.getScoreState);

  ticker = Ticker({
    onTick,
    startTick,
    getTickLength,
    totalTicks,
    onPause: null,
    onResume: null,
  });

  sampleDownloader = SampleDownloader({
    sampleFiles: [
      '1921-1930.wav',
      '1931-1940.wav',
      '1941-1950.wav',
      '1951-1960.wav',
      '1961-1970.wav',
      '1971-1980.wav',
      '1981-1990.wav',
      '1991-2000.wav',
      '2001-2010.wav',
      '2011-2020.wav',
      '2021.wav',
      'trumpet-D2.wav',
      'timpani-d.wav',
      //'flute-G4-edit.wav'
    ],
    localMode: true,
    onComplete,
    handleError,
  });
  sampleDownloader.startDownloads();

  // TODO: Test non-locally.
  function onComplete({ buffers }) {
    mainScoreDirector = ScoreDirector({
      directorName: 'main',
      ctx,
      sampleBuffer: buffers[sampleIndex],
      mainOutNode,
      constantEnvelopeLength: 1.0,
      envelopeCurve: new Float32Array([0, 0.5, 1]),
    });
    lowScoreDirector = ScoreDirector({
      directorName: 'low',
      ctx,
      sampleBuffer: buffers[0],
      mainOutNode,
      ampFactor: 1.5,
      fadeLengthFactor: 1,
    });
    narrationDirector = ScoreDirector({
      directorName: 'narration',
      ctx,
      sampleBuffer: null,
      variableSampleBuffers: buffers.slice(4),
      mainOutNode,
      idScoreEvent: function getSampleIndex(scoreEvent: ScoreEvent) {
        if (!isNaN(scoreEvent.variableSampleIndex)) {
          return '' + scoreEvent.variableSampleIndex;
        }
        return 'rest';
      },
    });

    wireControls({
      onStart,
      onPieceLengthChange,
      onTempoFactorChange,
      totalTicks,
      tempoFactor,
    });
  }

  function onTick({ ticks, currentTickLengthSeconds }) {
    console.log(ticks, currentTickLengthSeconds);
    //var chord = director.getChord({ ticks });
    var mainGroupScoreState = mainGroupScoreStateObjects[ticks];
    var lowGroupScoreState = lowGroupScoreStateObjects[ticks];
    var narrationGroupScoreState = narrationGroupScoreStateObjects[ticks];

    var tickLength = currentTickLengthSeconds;
    if (!isNaN(mainGroupScoreState.tickLength)) {
      tickLength = mainGroupScoreState.tickLength;
    }
    renderEventDirection({
      tickIndex: ticks,
      tickLength,
      chordSize: mainGroupScoreState.meta.chordPitchCount,
    });

    renderDensity({
      valueOverTimeArray: mainGroupScoreStateObjects.map(
        ({ tickLength, meta }) => ({
          time: tickLength,
          value: meta.chordPitchCount,
        })
      ),
      totalTime: totalSeconds,
      valueMax: tonalityDiamondPitches.length,
      currentTick: ticks,
    });

    renderTickLengths({
      valueOverTimeArray: mainGroupScoreStateObjects.map(({ tickLength }) => ({
        time: 1,
        value: tickLength,
      })),
      totalTime: mainGroupScoreStateObjects.length,
      valueMax: mainGroupScoreStateObjects.reduce(
        (max, direction) =>
          direction.tickLength > max ? direction.tickLength : max,
        0
      ),
      currentTick: ticks,
    });

    mainScoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, mainGroupScoreState)
    );
    lowScoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, lowGroupScoreState)
    );
    narrationDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, narrationGroupScoreState)
    );
  }

  function getTickLength(ticks) {
    if (ticks < mainGroupScoreStateObjects.length) {
      var tickLength = mainGroupScoreStateObjects[ticks].tickLength;
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
