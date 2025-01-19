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
import { Reverb } from 'synthskel/synths/synth-node';
import { Transposer } from './updaters/transposer';
// import { NarrationDataComposer } from './updaters/narration-data-composer';
import { /*enableGoodlog,*/ goodlog } from './tasks/goodlog';

// enableGoodlog();

var randomId = RandomId();
var routeState;
var { getCurrentContext } = ContextKeeper();
var ticker;
var sampleDownloader;
var mainScoreDirector;
var part2ScoreDirector;
var part3ScoreDirector;
var part4ScoreDirector;
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
  chordScaleExponent = 1,
  chordSizeLengthExp = 3,
  finalFadeOutLength = 16,
  part1Sample = 'marimba-d3-long.wav',
  part1Impulse = 'echoey-impulse.wav',
  part2Sample = 'trumpet-D2.eqd.wav',
  part2Impulse = 'spacey-impulse.wav',
  part2SampleLoopEnd = 0,
  part2TransposeFreqFactor = 0.25,
  part3Sample = 'french-horn-D2.wav', // 16,
  part3Impulse = 'echoey-impulse.wav',
  // Use 0 to tell Transposer to not loop by default.
  part3SampleLoopEnd = 0, //10,
  part3TransposeFreqFactor = 2,
  part4Sample = 'glass-more-full.wav',
  part4Impulse = 'spacey-impulse.wav',
  part4SampleLoopEnd = 5,
  part4TransposeFreqFactor = 1,
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
    loopEndSeconds: 1,
    adjustLoopForRate: true,
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

  var part2Transposer = Transposer({
    seed,
    freqFactor: +part2TransposeFreqFactor,
    eventProportionToTranspose: 0.4,
    sampleLoopStart: 0,
    sampleLoopEnd: +part2SampleLoopEnd,
    panDelta: -0.5,
  });
  var part2GroupScoreStateObjects: ScoreState[] =
    mainGroupScoreStateObjects.map(part2Transposer.getScoreState);

  var part3Transposer = Transposer({
    seed,
    freqFactor: +part3TransposeFreqFactor,
    eventProportionToTranspose: 0.5,
    sampleLoopStart: 0,
    sampleLoopEnd: +part3SampleLoopEnd,
    panDelta: +0.5,
  });
  var part3GroupScoreStateObjects: ScoreState[] =
    mainGroupScoreStateObjects.map(part3Transposer.getScoreState);

  var part4Transposer = Transposer({
    seed,
    freqFactor: +part4TransposeFreqFactor,
    eventProportionToTranspose: 0.75,
    sampleLoopStart: 0,
    sampleLoopEnd: +part4SampleLoopEnd,
    panDelta: 0,
  });
  var part4GroupScoreStateObjects: ScoreState[] =
    mainGroupScoreStateObjects.map(part4Transposer.getScoreState);

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
  function onComplete({ buffersByFilename }) {
    var part1Out = new Reverb(ctx, { buffer: buffersByFilename[part1Impulse] });
    part1Out.connect({ synthNode: mainOutNode, audioNode: null });
    var part2Out = new Reverb(ctx, { buffer: buffersByFilename[part2Impulse] });
    part2Out.connect({ synthNode: mainOutNode, audioNode: null });
    var part3Out = new Reverb(ctx, { buffer: buffersByFilename[part3Impulse] });
    part3Out.connect({ synthNode: mainOutNode, audioNode: null });
    var part4Out = new Reverb(ctx, { buffer: buffersByFilename[part4Impulse] });
    part4Out.connect({ synthNode: mainOutNode, audioNode: null });

    mainScoreDirector = ScoreDirector({
      directorName: 'main',
      ctx,
      sampleBuffer: buffersByFilename[part1Sample],
      outNode: part1Out,
      ampFactor: 5.0,
      constantEnvelopeLength: 1.0,
      envelopeCurve: new Float32Array([1, 1]),
      slideMode: false,
    });
    part2ScoreDirector = ScoreDirector({
      directorName: 'part2',
      ctx,
      sampleBuffer: buffersByFilename[part2Sample],
      outNode: part2Out,
      ampFactor: 0.25,
      envelopeCurve: defaultADSRCurve,
      fadeLengthFactor: 1,
      slideMode: false,
    });

    part3ScoreDirector = ScoreDirector({
      directorName: 'part3',
      ctx,
      sampleBuffer: buffersByFilename[part3Sample],
      outNode: part3Out,
      ampFactor: 0.5,
      envelopeCurve: defaultADSRCurve,
      fadeLengthFactor: 3,
      slideMode: false,
      mute: false,
    });

    part4ScoreDirector = ScoreDirector({
      directorName: 'part4',
      ctx,
      sampleBuffer: buffersByFilename[part4Sample],
      outNode: part4Out,
      ampFactor: 1,
      envelopeCurve: defaultADSRCurve,
      fadeLengthFactor: 3,
      slideMode: false,
      mute: true,
    });
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
    goodlog(ticks, currentTickLengthSeconds);
    //var chord = director.getChord({ ticks });
    var mainGroupScoreState = mainGroupScoreStateObjects[ticks];
    var part2GroupScoreState = part2GroupScoreStateObjects[ticks];
    var part3GroupScoreState = part3GroupScoreStateObjects[ticks];
    var part4GroupScoreState = part4GroupScoreStateObjects[ticks];
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
    part2ScoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, part2GroupScoreState)
    );
    part3ScoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, part3GroupScoreState)
    );
    part4ScoreDirector.play(
      Object.assign({ tickLengthSeconds: tickLength }, part4GroupScoreState)
    );
    // narrationDirector.play(
    //   Object.assign({ tickLengthSeconds: tickLength }, narrationGroupScoreState)
    // );

    renderVisualizationForTick(mainGroupScoreState);
  }

  function onEndOfTicks() {
    mainScoreDirector.end();
    part2ScoreDirector.end();
    part3ScoreDirector.end();
    part4ScoreDirector.end();
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
