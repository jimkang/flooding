import { ScoreState } from 'synthskel/types';
import { select } from 'd3-selection';
import vertexShaderSrc from './shaders/vertex-shader';
import fragmentShaderSrc from './shaders/fragment-shader';
import { PausableTimer } from '../tasks/pausable-timer.js';

var monthLabel = select('.month');
var yearLabel = select('.year');
var levelLabel = select('.ohc-level');
var gl;
var program;
var glBuffer;
var densityLocation;
var timeLocation;
var resLocation;

// var currentPeriod = 2 * Math.PI;

var densityTransition = {
  start: 0,
  end: 0,
  transitionLengthInMS: 0,
  shaderUpdateIntervalInMS: 1,
  lastShaderUpdate: 0,
  inProgress: true,
  timer: null,
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

export function renderShader({ density, tickLengthInMS }) {
  if (!gl) {
    setUpShaders();
    if (!mainTimer) {
      mainTimer = PausableTimer('main');
    }
    requestAnimationFrame(updateShader);
  }

  gl.uniform2fv(resLocation, [gl.canvas.width, gl.canvas.height]);
  setDensity(density, Math.min(1500, tickLengthInMS / 3));
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

  densityLocation = gl.getUniformLocation(program, 'u_density');
  timeLocation = gl.getUniformLocation(program, 'u_time');
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
  const elapsed = mainTimer.getElapsed();
  // console.log('elapsed', elapsed.toFixed(2));

  gl.uniform1f(timeLocation, elapsed / 1000);
  updateDensity();

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

  if (!densityTransition.timer) {
    densityTransition.timer = PausableTimer(
      'Transition to ' + densityTransition.end
    );
    densityTransition.lastShaderUpdate = 0;
    gl.uniform1f(densityLocation, densityTransition.start);
    // console.log('Set density uniform to', densityTransition.start.toFixed(4));
    return densityTransition.start;
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

  const density =
    densityTransition.start +
    progress * (densityTransition.end - densityTransition.start);

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

function setDensity(density, transitionLengthInMS) {
  const tooFastForTimers = transitionLengthInMS < 100;
  if (!tooFastForTimers && densityTransition.timer) {
    densityTransition.timer.end();
    densityTransition.timer = null;
  }
  densityTransition.start = densityTransition.end;
  densityTransition.end = density;
  densityTransition.transitionLengthInMS = transitionLengthInMS;
}
