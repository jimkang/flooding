import { ScoreState } from 'synthskel/types';
import { select } from 'd3-selection';
import vertexShaderSrc from './shaders/vertex-shader';
import fragmentShaderSrc from './shaders/fragment-shader';

var monthLabel = select('.month');
var yearLabel = select('.year');
var levelLabel = select('.ohc-level');
var gl;
var program;
var glBuffer;
var donenessLocation;
var densityLocation;
var timeLocation;

var densityTransition = {
  start: 0,
  end: 0,
  startTimestamp: 0,
  transitionLengthInMS: 0,
};

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

export function renderShader({ density, doneness }) {
  // console.log('density', density, 'doneness', doneness);
  if (!gl) {
    setUpShaders();
    window.requestAnimationFrame(updateShader);
  }

  gl.uniform1f(donenessLocation, doneness);
  setDensity(density, 2000);
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

function updateShader(timestamp) {
  gl.uniform1f(densityLocation, getDensity(timestamp));
  gl.uniform1f(timeLocation, timestamp / 1000);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(updateShader);
}

function getDensity(timestamp) {
  const elapsed = timestamp - densityTransition.startTimestamp;
  var progress = elapsed / densityTransition.transitionLengthInMS;
  if (progress > 1) {
    progress = 1;
  }
  const span = densityTransition.end - densityTransition.start;
  const density = densityTransition.start + progress * span;
  console.log('density', density);
  return density;
}

function setDensity(density, transitionLengthInMS) {
  densityTransition.start = densityTransition.end;
  densityTransition.end = density;
  densityTransition.startTimestamp = performance.now();
  densityTransition.transitionLengthInMS = transitionLengthInMS;
}
