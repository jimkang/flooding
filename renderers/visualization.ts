import { ScoreState } from 'synthskel/types';
import { select } from 'd3-selection';
import vertexShaderSrc from './shaders/vertex-shader';
import fragmentShaderSrc from './shaders/fragment-shader';
import { PausableTimer } from '../tasks/pausable-timer';

var monthLabel = select('.month');
var yearLabel = select('.year');
var levelLabel = select('.ohc-level');
var gl;
var program;
var glBuffer;
var donenessLocation;
var densityLocation;
var timeLocation;
var wiggleLocation;
var resLocation;

var wiggleIndex = 0;
var lastWiggleFactor = 1;
// var currentPeriod = 2 * Math.PI;

var densityTransition = {
  start: 0,
  end: 0,
  transitionLengthInMS: 0,
  shaderUpdateIntervalInMS: 1,
  lastShaderUpdate: 0,
  inProgress: true,
  timer: null,
  doneness: 0,
};

var mainTimer;

export function renderVisualizationForTick(scoreState: ScoreState) {
  var monthDatum = scoreState?.meta?.sourceDatum;
  if (monthDatum) {
    let date = new Date(monthDatum.date);
    // eslint-disable-next-line
    // @ts-ignore
    const month = date.toLocaleString({}, { month: 'long' });
    monthLabel.text(month);
    yearLabel.text(monthDatum.year);
    levelLabel.text(monthDatum.value.toFixed(2));
  }
}

export function renderShader({ density, tickLengthInMS, doneness }) {
  // console.log('density', density, 'doneness', doneness);
  if (!gl) {
    setUpShaders();
    if (!mainTimer) {
      mainTimer = PausableTimer('main');
    }
    requestAnimationFrame(updateShader);
  }

  gl.uniform1f(donenessLocation, doneness);
  gl.uniform2fv(resLocation, [gl.canvas.width, gl.canvas.height]);
  setDensity(density, Math.min(1000, tickLengthInMS / 3), doneness);
}

function setUpShaders() {
  gl = getRenderingContext();

  var vertexShader = createShader(vertexShaderSrc, gl.VERTEX_SHADER);
  var fragmentShader = createShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);

  program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.detachShader(program, vertexShader);
  gl.detachShader(program, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var linkErrLog = gl.getProgramInfoLog(program);
    cleanup();
    throw new Error(
      'Shader program did not link successfully. ' + 'Error log: ' + linkErrLog
    );
  }

  initializeGlAttributes();

  gl.useProgram(program);

  donenessLocation = gl.getUniformLocation(program, 'u_doneness');
  densityLocation = gl.getUniformLocation(program, 'u_density');
  timeLocation = gl.getUniformLocation(program, 'u_time');
  wiggleLocation = gl.getUniformLocation(program, 'u_wiggle');
  resLocation = gl.getUniformLocation(program, 'u_res');
  // cleanup();
}

function initializeGlAttributes() {
  var squareArray = gl.createVertexArray();
  gl.bindVertexArray(squareArray);

  var positions = new Float32Array([
    -1, -1, 0,
    //
    1, -1, 0,
    //
    -1, 1, 0,
    //
    1, 1, 0,
  ]);

  var positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);
}

function cleanup() {
  gl.useProgram(null);
  if (glBuffer) {
    gl.deleteBuffer(glBuffer);
  }
  if (program) {
    gl.deleteProgram(program);
  }
}

function getRenderingContext() {
  var canvas = document.getElementById('shader-canvas') as HTMLCanvasElement;
  var gl = canvas.getContext('webgl2');

  if (!gl) {
    throw new Error(
      'Failed to get WebGL context. Your browser or device may not support WebGL 2.'
    );
  }
  return gl;
}

function createShader(src, shaderType) {
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

function updateShader() {
  const elapsed = mainTimer.isPaused() ? 1 : mainTimer.getElapsed();
  // console.log('elapsed', elapsed.toFixed(2));

  gl.uniform1f(timeLocation, elapsed / 1000);
  updateDensity();
  var wiggleFactor = lastWiggleFactor;
  // Don't change the wiggle factor while a transition is happening.
  if (!densityTransition.inProgress) {
    wiggleFactor = wiggleIndex; // * densityTransition.doneness;
    wiggleIndex += 1;
  }
  gl.uniform1f(wiggleLocation, wiggleFactor);
  // console.log('u_wiggle', wiggleFactor);
  lastWiggleFactor = wiggleFactor;

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(updateShader);
}

function updateDensity() {
  const tooFastForTimers = densityTransition.transitionLengthInMS < 100;
  var elapsedTransitionTime = 0;
  var progress = 0;
  if (!tooFastForTimers && densityTransition.timer) {
    elapsedTransitionTime = densityTransition.timer.getElapsed();
    progress = elapsedTransitionTime / densityTransition.transitionLengthInMS;
    if (progress > 1) {
      progress = 1;
    }
  }
  densityTransition.inProgress = progress < 1 && progress > 0;

  // if (progress >= 1) {
  //   currentPeriod = Math.pow(1 - densityTransition.end, 3);
  //   // TODO: Set uniform with this.
  // }

  if (!densityTransition.timer) {
    // It actually jitters *after* the start of the transition.
    // It happens if you stop horizontal movement, even.
    // It doesn't havven if you take time out of the amp calculation.
    //
    // if (mainTimer.getElapsed() % currentPeriod < 0.001) {
    //   console.log('At start of new period, starting density transition.');
    // } else {
    //   console.log(
    //     'In middle of new period, NOT starting density transition. Mod:',
    //     mainTimer.getElapsed() % currentPeriod,
    //     'Current period',
    //     currentPeriod
    //   );
    //   return;
    // }

    densityTransition.timer = PausableTimer(
      'Transition to ' + densityTransition.end
    );
    densityTransition.lastShaderUpdate = 0;
    gl.uniform1f(densityLocation, densityTransition.start);
    // console.log('Set density uniform to', densityTransition.start.toFixed(4));
    return densityTransition.start;
  }

  if (!tooFastForTimers) {
    if (densityTransition.inProgress) {
      // Changing time while transitioning density will appear to "restart" the
      // waves so we need to pause the main timer.
      mainTimer.pause();
    } else {
      if (mainTimer.isPaused()) {
        mainTimer.resume();
      }
    }
  }

  if (
    !tooFastForTimers &&
    elapsedTransitionTime - densityTransition.lastShaderUpdate <
      densityTransition.shaderUpdateIntervalInMS
  ) {
    // console.log(
    //   'Not enough time has passed to update.',
    //   elapsedTransitionTime - densityTransition.lastShaderUpdate
    // );
    return;
  }

  // const span = densityTransition.end - densityTransition.start;
  // First move things to zero, then back up to the destination.
  var density = 0;
  if (progress <= 0.5) {
    density =
      densityTransition.start -
      Math.pow(progress * 2, 2) * densityTransition.start;
  }
  if (progress > 0.5) {
    density =
      (1 - Math.pow(1 - (progress - progress * 0.5) * 2, 2)) *
      densityTransition.end;
  }
  gl.uniform1f(densityLocation, density);
  densityTransition.lastShaderUpdate = elapsedTransitionTime;
  // console.log(
  //   'Set density uniform to',
  //   density.toFixed(4),
  //   'progress',
  //   progress
  // );
  return density;
}

function setDensity(density, transitionLengthInMS, doneness) {
  const tooFastForTimers = transitionLengthInMS < 100;
  if (!tooFastForTimers && densityTransition.timer) {
    densityTransition.timer.end();
    densityTransition.timer = null;
  }
  densityTransition.start = densityTransition.end;
  densityTransition.end = density;
  densityTransition.transitionLengthInMS = transitionLengthInMS;
  densityTransition.doneness = doneness;
  // console.log('Updated densityTransition', densityTransition);
}
