import { scaleLinear } from 'd3-scale';

var wired = false;
var drawing = false;
var canvas = document.getElementById('density-canvas');
var canvasCtx = canvas.getContext('2d', { alpha: false });
canvasCtx.lineWidth = 1;
const width = +canvas.getAttribute('width');
const height = +canvas.getAttribute('height');

export function renderDensityCanvas({ densityOverTimeArray, densityMin = 1, densityMax }) {
  var x, y;

  if (!wired) {
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    canvas.addEventListener('touchstart', onMouseDown);
    window.addEventListener('touchend', onMouseUp);
    window.addEventListener('touchcancel', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);

    x = scaleLinear().domain([0, densityOverTimeArray.length]).range([0, width]);
    // In canvas, and GUIs in general, remember:
    // +y is down! If we want positive values to be
    // higher than negative ones, we must flip their
    // signs.
    y = scaleLinear().domain([densityMin, densityMax]).range([height, 0]);

    wired = true;
  }

  function onMouseDown(e) {
    e.preventDefault();
    drawing = true;
  }

  function onMouseUp() {
    drawing = false;
  }

  function onMouseMove(e) {
    if (!drawing) {
      return;
    }

    densityOverTimeArray[Math.floor(x.invert(e.offsetX))] = y.invert(e.offsetY);
    //console.log(e.offsetX, e.offsetY);
    console.log(densityOverTimeArray);
    requestAnimationFrame(drawDensities);
  }

  function drawDensities() {
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.fillRect(0, 0, width, height);


    for (let i = 0; i < densityOverTimeArray.length; ++i) {
      const xTime = x(i);
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = 'green';
      canvasCtx.moveTo(xTime, 0);
      canvasCtx.lineTo(xTime, y(densityOverTimeArray[i]));
      canvasCtx.stroke();
    }

  }
}

