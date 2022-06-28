import { scaleLinear } from 'd3-scale';
import debounce from 'lodash.debounce';

var theDensityOverTimeArray;
var wired = false;
var drawing = false;
var canvas = document.getElementById('density-canvas');
var canvasCtx = canvas.getContext('2d', { alpha: false });
canvasCtx.lineWidth = 1;
const width = +canvas.getAttribute('width');
const height = +canvas.getAttribute('height');
var x, y;
var lastIndexFilled = 0;
var debouncedOnChange; 

export function renderDensityCanvas({
  densityOverTimeArray, densityMin = 1, densityMax, onChange
}) {
  theDensityOverTimeArray = densityOverTimeArray;
  debouncedOnChange = debounce(onChange, 300);
  requestAnimationFrame(drawDensities);

  if (!wired) {
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    canvas.addEventListener('touchstart', onMouseDown);
    window.addEventListener('touchend', onMouseUp);
    window.addEventListener('touchcancel', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);

    x = scaleLinear().domain([0, theDensityOverTimeArray.length]).range([0, width]);
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
    if (drawing) {
      setTimeout(() => debouncedOnChange(theDensityOverTimeArray.slice()), 0);
    }
    drawing = false;
  }

  function onMouseMove(e) {
    if (!drawing) {
      return;
    }

    fillToPoint(Math.floor(x.invert(e.offsetX)), y.invert(e.offsetY));
    //console.log(e.offsetX, e.offsetY);
    //console.log(theDensityOverTimeArray);
    requestAnimationFrame(drawDensities);
  }

  // We need to interpolate to fill in gaps in the array.
  function fillToPoint(index, val) {
    const anchorVal = theDensityOverTimeArray[lastIndexFilled];
    const fillDirection = index > lastIndexFilled ? 1 : -1;
    for (let interpIndex = lastIndexFilled; interpIndex !== index; interpIndex += fillDirection) {
      // This can be something fancier than linear, if it helps.
      const interpVal = anchorVal + (interpIndex - lastIndexFilled)/(index - lastIndexFilled) * (val - anchorVal);
      theDensityOverTimeArray[interpIndex] = interpVal;
    }
    theDensityOverTimeArray[index] = val;
    lastIndexFilled = index;
  }

  function drawDensities() {
    canvasCtx.clearRect(0, 0, width, height);
    canvasCtx.fillRect(0, 0, width, height);


    for (let i = 0; i < theDensityOverTimeArray.length; ++i) {
      const xTime = x(i);
      canvasCtx.beginPath();
      canvasCtx.strokeStyle = 'green';
      canvasCtx.moveTo(xTime, y(theDensityOverTimeArray[i]));
      canvasCtx.lineTo(xTime, height);
      canvasCtx.stroke();
    }

  }
}

