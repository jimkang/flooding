import { ScoreState } from 'synthskel/types';
import { select } from 'd3-selection';
import vertexShaderSrc from './shaders/vertex-shader';
import fragmentShaderSrc from './shaders/flood-noise-fragment-shader.js';
import { PausableTimer } from '../tasks/pausable-timer.js';

var monthLabel = select('.month');
var yearLabel = select('.year');
var levelLabel = select('.ohc-level');
var gl;
var program;
var glBuffer;
var densityLocation;
var ampChangeFreqMultLocation;
var ampChangeMultLocation;
var timeLocation;
var resLocation;

// var currentPeriod = 2 * Math.PI;

var mainTimer;

export function initVisualization() {
  var canvasSel = select('#shader-canvas');
  var rect = canvasSel.node().getBoundingClientRect();
  canvasSel.attr('width', rect.width).attr('height', rect.height);
}

export function toggleStartButton() {
  select('.energy-info').classed('hidden', false);
  select('#start-button').text('Pause');
}

export function renderVisualizationForTick(scoreState: ScoreState) {
  var monthDatum = scoreState?.meta?.sourceDatum;
  if (monthDatum) {
    let date = new Date(monthDatum.date);
    // eslint-disable-next-line
    // @ts-ignore
    const month = date.toLocaleString({}, { month: 'long' });
    monthLabel.text(month);
    yearLabel.text(monthDatum.year);
    // OHC value is in 10x22 joules. A zettajoule is 10x21 joules.
    levelLabel.text((monthDatum.value * 10).toFixed(2));

    // d = w/f
    // const metersMoved = monthDatum.value * Math.pow(10, 22) /
  }
}

export function renderShader({ density, ampChangeMult, ampFreqChangeMult }) {
  if (!gl) {
    setUpShaders();
    if (!mainTimer) {
      mainTimer = PausableTimer('main');
    }
    requestAnimationFrame(updateShader);
  }

  gl.uniform2fv(resLocation, [gl.canvas.width, gl.canvas.height]);
  gl.uniform1f(densityLocation, density);
  gl.uniform1f(ampChangeMultLocation, ampChangeMult);
  gl.uniform1f(ampChangeFreqMultLocation, ampFreqChangeMult);
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
  ampChangeMultLocation = gl.getUniformLocation(program, 'u_ampChangeMult');
  ampChangeFreqMultLocation = gl.getUniformLocation(
    program,
    'u_ampChangeFreqMult'
  );
  timeLocation = gl.getUniformLocation(program, 'u_time');
  resLocation = gl.getUniformLocation(program, 'u_resolution');
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

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  requestAnimationFrame(updateShader);
}
