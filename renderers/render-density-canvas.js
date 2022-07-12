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
var strokeTimeInEvents = 0;

export function renderDensityCanvas({
  densityOverTimeArray, densityMin = 1, densityMax, onChange,
  maxEventCountForStroke = 50
}) {
  theDensityOverTimeArray = densityOverTimeArray;
  debouncedOnChange = debounce(onChange, 300);
  requestAnimationFrame(drawDensities);

  if (!wired) {
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    canvas.addEventListener('touchstart', onMouseDown);
    canvas.addEventListener('touchend', onMouseUp);
    canvas.addEventListener('touchcancel', onMouseUp);
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
    strokeTimeInEvents = 0;
  }

  function onMouseUp() {
    if (drawing) {
      strokeTimeInEvents = 0;
      debouncedOnChange(theDensityOverTimeArray.slice());
    }
    drawing = false;
  }

  function onMouseMove(e) {
    if (!drawing) {
      return;
    }

    strokeTimeInEvents += 1;
    fillToPoint(Math.floor(x.invert(e.offsetX)), y.invert(e.offsetY));
    //console.log(e.offsetX, e.offsetY);
    //console.log(theDensityOverTimeArray);
    requestAnimationFrame(drawDensities);
    if (strokeTimeInEvents >= maxEventCountForStroke) {
      //console.log('Forcing stroke commit', strokeTimeInEvents);
      debouncedOnChange(theDensityOverTimeArray.slice());
      strokeTimeInEvents = 0;
    }
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

