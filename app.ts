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
import {
  defaultSecondsPerTick,
  sampleFilenames,
  defaultADSRCurve,
  tonalityDiamondPitches,
} from './consts';
import { preRunComposer } from './updaters/pre-run-composer';
import { RenderTimeSeries } from './renderers/render-time-series';
import { renderEventDirection } from './renderers/render-event-direction';
import { renderVisualizationForTick } from './renderers/visualization';
// import bostonMSL from './data/rlr_monthly/json-data/235.json';
import ohcByQuarter from './data/ohc_levitus_climdash_seasonal.json';
import { ScoreState /*, ScoreEvent*/ } from 'synthskel/types';
// import { SubjectDatum } from './types';
import { MainOut } from 'synthskel/synths/main-out';
import { Transposer } from './updaters/transposer';
// import { NarrationDataComposer } from './updaters/narration-data-composer';

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var mainScoreDirector;
var lowScoreDirector;
var highScoreDirector;
// var narrationDirector;

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
  sampleIndex = 18,
  impulseIndex = 17,
  lowVoiceSampleIndex = 13,
  lowSampleLoopEnd = 7,
  lowTransposeFreqFactor = 0.125,
  highVoiceSampleIndex = 16,
  highSampleLoopEnd = 0, //10, Tell Transposer to not loop by default.
  highTransposeFreqFactor = 0.5,
  playHighPart = true,
  playLowPart = false,
  chordScaleExponent = 1,
  chordSizeLengthExp = 3,
  finalFadeOutLength = 16,
}) {
  if (!seed) {
    routeState.addToRoute({ seed: randomId(8) });
    return;
  }

  var ohcData = ohcByQuarter.slice();
  // insertYearBreaks(ohcData);

  if (!totalTicks) {
    routeState.addToRoute({ totalTicks: ohcData.length });
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
    data: ohcData,
    chordProp: 'value',
    chordXFloor: 0, // 6809,
    chordXCeil: 31, // 7387,
    chordScaleExponent: +chordScaleExponent,
    chordSizeLengthExp: +chordSizeLengthExp,
    seed,
    totalTicks,
    shouldLoop: true,
    loopEndSeconds: 6,
    adjustLoopForRate: true,
  });
  var mainGroupScoreStateObjects: ScoreState[] = preRunComposer({
    composer,
    totalTicks,
  });
  console.log(mainGroupScoreStateObjects);
  console.log(mainGroupScoreStateObjects.map((s) => s.durationTicks));
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
    (state) =>
      (state.events.length > 0 && !state.events.some((e) => !e.delay)) ||
      state.tickLength <= 0
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

  if (playLowPart) {
    var lowTransposer = Transposer({
      seed,
      freqFactor: +lowTransposeFreqFactor,
      eventProportionToTranspose: 0.5,
      sampleLoopStart: 0,
      sampleLoopEnd: +lowSampleLoopEnd,
    });
    var lowGroupScoreStateObjects: ScoreState[] =
      mainGroupScoreStateObjects.map(lowTransposer.getScoreState);
  }

  if (playHighPart) {
    var highTransposer = Transposer({
      seed,
      freqFactor: +highTransposeFreqFactor,
      eventProportionToTranspose: 0.75,
      sampleLoopStart: 0,
      sampleLoopEnd: +highSampleLoopEnd,
    });
    var highGroupScoreStateObjects: ScoreState[] =
      mainGroupScoreStateObjects.map(highTransposer.getScoreState);
  }

  // var narrationComposer = NarrationDataComposer();
  // var narrationGroupScoreStateObjects: ScoreState[] =
  //   mainGroupScoreStateObjects.map(narrationComposer.getScoreState);

  ticker = Ticker({
    onTick,
    startTick,
    getTickLength,
    totalTicks,
    onPause: null,
    onResume: null,
    onEndOfTicks,
  });

  sampleDownloader = SampleDownloader({
    sampleFiles: sampleFilenames,
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
      impulseBuffer: buffers[impulseIndex],
      mainOutNode,
      ampFactor: 5.0,
      constantEnvelopeLength: 1.0,
      envelopeCurve: new Float32Array([1, 1]),
      slideMode: false,
    });
    if (playLowPart) {
      lowScoreDirector = ScoreDirector({
        directorName: 'low',
        ctx,
        sampleBuffer: buffers[lowVoiceSampleIndex],
        impulseBuffer: buffers[impulseIndex],
        mainOutNode,
        ampFactor: 1,
        envelopeCurve: defaultADSRCurve,
        fadeLengthFactor: 1,
        slideMode: false,
      });
    }
    if (playHighPart) {
      highScoreDirector = ScoreDirector({
        directorName: 'high',
        ctx,
        sampleBuffer: buffers[highVoiceSampleIndex],
        impulseBuffer: buffers[impulseIndex],
        mainOutNode,
        ampFactor: 0.5,
        envelopeCurve: defaultADSRCurve,
        fadeLengthFactor: 3,
        slideMode: false,
        mute: false,
      });
    }
    // narrationDirector = ScoreDirector({
    //   directorName: 'narration',
    //   ctx,
    //   sampleBuffer: null,
    //   variableSampleBuffers: buffers.slice(0, 11),
    //   mainOutNode,
    //   idScoreEvent: function getSampleIndex(scoreEvent: ScoreEvent) {
    //     if (!isNaN(scoreEvent.variableSampleIndex)) {
    //       return '' + scoreEvent.variableSampleIndex;
    //     }
    //     return 'rest';
    //   },
    //   // Narration samples should not fade.
    //   envelopeCurve: new Float32Array([1, 1]),
    //   slideMode: false,
    // });

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
    if (playLowPart) {
      var lowGroupScoreState = lowGroupScoreStateObjects[ticks];
    }
    if (playHighPart) {
      var highGroupScoreState = highGroupScoreStateObjects[ticks];
    }
    // var narrationGroupScoreState = narrationGroupScoreStateObjects[ticks];

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
    if (playLowPart) {
      lowScoreDirector.play(
        Object.assign({ tickLengthSeconds: tickLength }, lowGroupScoreState)
      );
    }
    if (playHighPart) {
      highScoreDirector.play(
        Object.assign({ tickLengthSeconds: tickLength }, highGroupScoreState)
      );
    }
    // narrationDirector.play(
    //   Object.assign({ tickLengthSeconds: tickLength }, narrationGroupScoreState)
    // );

    renderVisualizationForTick(mainGroupScoreState);
  }

  function onEndOfTicks() {
    mainScoreDirector.end();
    lowScoreDirector.end();
    if (playHighPart) {
      highScoreDirector.end();
    }
    mainOutNode.fadeOut(finalFadeOutLength);
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

// function insertYearBreaks(data: SubjectDatum[]) {
//   // var currentYear;
//   var currentDecade;
//   for (let i = data.length - 1; i > 0; --i) {
//     let datum = data[i];
//     let year = datum.year;
//     let decade = Math.floor(+year / 10);
//     if (currentDecade !== undefined && currentDecade !== decade) {
//       data.splice(i + 1, 0, {
//         date: datum.date,
//         year,
//         month: datum.month,
//         value: datum.value,
//         pauseInsert: true,
//       });
//     }
//     currentDecade = decade;
//   }
// }

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
