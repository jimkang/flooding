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
  flatADSR,
  tonalityDiamondPitches,
} from './consts';
import { preRunComposer } from './updaters/pre-run-composer';
import { RenderTimeSeries } from './renderers/render-time-series';
import { renderEventDirection } from './renderers/render-event-direction';
import { renderVisualizationForTick } from './renderers/visualization';
// import bostonMSL from './data/rlr_monthly/json-data/235.json';
import ohcByQuarter from './data/ohc_levitus_climdash_seasonal.json';
import { ScoreState } from 'synthskel/types';
// import { SubjectDatum } from './types';
import { MainOut } from 'synthskel/synths/main-out';
import { Reverb } from 'synthskel/synths/synth-node';
import { Transposer } from './updaters/transposer';
// import { NarrationDataComposer } from './updaters/narration-data-composer';
import { enableGoodlog, goodlog } from './tasks/goodlog';

enableGoodlog();

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var scoreDirectors = [];

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
  chordScaleExponent = 1,
  chordSizeLengthExp = 2,
  finalFadeOutLength = 16,
  constantTickLength = false,
  fixedEndTickLength = 30,
  parts = [
    {
      sample: 'RoboRhode-D2.wav', // 'PianoSoftRoll-D2.wav',
      impulse: 'spacey-impulse.wav',
      loop: false,
      sampleLoopEnd: 0,
      ampFactor: 0.5,
      // constantEnvelopeLength: 1.0,
      envelopeCurve: flatADSR,
      fadeLengthFactor: 0.01,
      slideMode: false,
      pan: -0.1,
      solo: false,
      // mute: true,
    },
    {
      sample: 'Vibraphone.sustain.ff.D3.wav',
      impulse: 'echoey-impulse.wav',
      loop: false,
      sampleLoopEnd: 0,
      transposeProportion: 0.5,
      transposeFreqFactor: 1,
      pan: 0.2,
      ampFactor: 1.0,
      envelopeCurve: flatADSR, // [0, 0.1, 0.2, 0.5, 1, 1],
      fadeLengthFactor: 0.05,
      slideMode: false,
      // mute: true,
      // solo: true,
    },
    {
      sample: 'trumpet-D2-eqd.wav',
      loop: true,
      sampleLoopEnd: 2,
      transposeProportion: 0.25,
      transposeFreqFactor: 0.25,
      pan: -0.2,
      ampFactor: 0.33, // * 0.5,
      envelopeCurve: flatADSR,
      fadeLengthFactor: 0.01,
      slideMode: false,
      // mute: true,
      // solo: true,
    },
    {
      sample: 'trumpet-D2-eqd.wav',
      loop: true,
      sampleLoopEnd: 2,
      transposeProportion: 0.8,
      transposeFreqFactor: 1.0,
      pan: -0.2,
      ampFactor: 0.18,
      envelopeCurve: flatADSR,
      fadeLengthFactor: 0.01,
      slideMode: false,
      // mute: true,
      // solo: true,
    },
    {
      sample: 'trumpet-D2-eqd.wav',
      impulse: 'echoey-impulse.wav',
      loop: true,
      sampleLoopEnd: 2,
      transposeProportion: 0.8,
      transposeFreqFactor: 0.5,
      pan: -0.2,
      ampFactor: 0.25,
      envelopeCurve: defaultADSRCurve,
      fadeLengthFactor: 0.01,
      slideMode: false,
      // mute: true,
      // solo: true,
    },
    {
      sample: 'cor_anglais-d4-PB-loop.wav',
      impulse: 'echoey-impulse.wav',
      loop: true,
      sampleLoopEnd: 2,
      transposeProportion: 1,
      transposeFreqFactor: 2,
      pan: 0.0,
      ampFactor: 0.5,
      envelopeCurve: defaultADSRCurve,
      fadeLengthFactor: 0.1,
      slideMode: false,
      // mute: true,
    },
    {
      sample: 'chorus-male-d3-PB-loop.wav',
      impulse: 'spacey-impulse.wav',
      sampleLoopEnd: 1.0,
      transposeProportion: 0.75,
      transposeFreqFactor: 1,
      pan: 0.5,
      ampFactor: 0.25,
      envelopeCurve: flatADSR,
      fadeLengthFactor: 0.1,
      slideMode: true,
      mute: true,
    },
    // {
    //   sample: 'celesta-g4-soft-PB.wav',
    //   impulse: 'spacey-impulse.wav',
    //   sampleLoopEnd: 5,
    //   transposeProportion: 0.75,
    //   transposeFreqFactor: 1,
    //   pan: 0,
    //   ampFactor: 0.5,
    //   envelopeCurve: defaultADSRCurve,
    //   fadeLengthFactor: 3,
    //   slideMode: false,
    //   mute: true,
    // },
    {
      sample: '205822__xserra__organ-c3-fade-out.wav',
      // sample: 'organ-d2.wav',
      loop: true,
      // impulse: 'echoey-impulse.wav',
      transposeProportion: 0.5,
      transposeFreqFactor: 9 / 8 / 2,
      pan: 0.0,
      ampFactor: 2,
      envelopeCurve: defaultADSRCurve,
      getEnvelopeLengthForScoreEvent(_scoreEvent, tickLength) {
        if (tickLength < 1.0) {
          return tickLength * tickLength;
        }
        return tickLength;
      },
      fadeLengthFactor: 0.1,
      slideMode: false,
      mute: false,
    },
  ],
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
    shouldLoop: parts[0].loop,
    loopEndSeconds: parts[0].sampleLoopEnd,
    adjustLoopForRate: true,
    constantTickLength,
    fixedEndTickLength,
  });
  var mainGroupScoreStateObjects: ScoreState[] = preRunComposer({
    composer,
    totalTicks,
  });
  goodlog(mainGroupScoreStateObjects);
  goodlog(mainGroupScoreStateObjects.map((s) => s.durationTicks));
  const totalSeconds = mainGroupScoreStateObjects.reduce(
    (total, direction) => total + direction.tickLength,
    0
  );
  goodlog('totalTime in minutes', totalSeconds / 60);
  goodlog(
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

  var transposers = parts.slice(1).map((part) =>
    Transposer({
      seed,
      freqFactor: +part.transposeFreqFactor,
      eventProportionToTranspose: part.transposeFreqFactor,
      shouldLoop: part.loop,
      sampleLoopStart: 0,
      sampleLoopEnd: +part.sampleLoopEnd,
      panDelta: part.pan,
    })
  );

  var partScoreStateObjectLists = transposers.map((transposer) =>
    mainGroupScoreStateObjects.map(transposer.getScoreState)
  );
  partScoreStateObjectLists.unshift(mainGroupScoreStateObjects);

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
  function onComplete({ buffersByFilename }) {
    var partOuts = [];

    for (let i = 0; i < parts.length; ++i) {
      let partOut = mainOutNode;
      const buffer = buffersByFilename[parts[i].impulse];
      if (buffer) {
        partOut = new Reverb(ctx, { buffer });
        partOut.connect({ synthNode: mainOutNode, audioNode: null });
      }
      partOuts.push(partOut);
    }

    var solosExist = parts.some((part) => part.solo);

    scoreDirectors = parts.map((part, i) =>
      ScoreDirector({
        directorName: part.sample + ' director',
        ctx,
        sampleBuffer: buffersByFilename[part.sample],
        outNode: partOuts[i],
        ampFactor: part.ampFactor,
        // constantEnvelopeLength: 1.0,
        envelopeCurve: part.envelopeCurve,
        fadeLengthFactor: part.fadeLengthFactor,
        slideMode: part.slideMode,
        mute: solosExist ? !part.solo : part.mute,
        getEnvelopeLengthForScoreEvent: part.getEnvelopeLengthForScoreEvent,
      })
    );

    wireControls({
      onStart,
      onPieceLengthChange,
      onTempoFactorChange,
      totalTicks,
      tempoFactor,
    });
  }

  function onTick({ ticks, currentTickLengthSeconds }) {
    goodlog(ticks, currentTickLengthSeconds);
    //var chord = director.getChord({ ticks });
    var groupScoreStates = partScoreStateObjectLists.map((list) => list[ticks]);
    var mainGroupScoreState = groupScoreStates[0];

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

    for (let i = 0; i < scoreDirectors.length; ++i) {
      scoreDirectors[i].play(
        Object.assign({ tickLengthSeconds: tickLength }, groupScoreStates[i])
      );
    }

    renderVisualizationForTick(mainGroupScoreState);
  }

  function onEndOfTicks() {
    scoreDirectors.forEach((dir) => dir.end());
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
