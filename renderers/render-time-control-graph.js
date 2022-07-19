import { scaleLinear } from 'd3-scale';
import debounce from 'lodash.debounce';

export function RenderTimeControlGraph({ canvasId, lineColor = 'green' }) {
  var theValueOverTimeArray;
  var wired = false;
  var drawing = false;
  var canvas = document.getElementById(canvasId);
  var canvasCtx = canvas.getContext('2d', { alpha: false });
  canvasCtx.lineWidth = 1;
  const width = +canvas.getAttribute('width');
  const height = +canvas.getAttribute('height');
  var x, y;
  var lastIndexFilled = 0;
  var debouncedOnChange; 
  var strokeTimeInEvents = 0;

  return renderTimeControlCanvas;

  function renderTimeControlCanvas({
    valueOverTimeArray, valueMin = 1, valueMax, onChange,
    maxEventCountForStroke = 50
  }) {
    theValueOverTimeArray = valueOverTimeArray;
    debouncedOnChange = debounce(onChange, 300);
    requestAnimationFrame(drawValues);

    if (!wired) {
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mousemove', onMouseMove);

      canvas.addEventListener('touchstart', onMouseDown);
      canvas.addEventListener('touchend', onMouseUp);
      canvas.addEventListener('touchcancel', onMouseUp);
      window.addEventListener('touchmove', onMouseMove);

      x = scaleLinear().domain([0, theValueOverTimeArray.length]).range([0, width]);
      // In canvas, and GUIs in general, remember:
      // +y is down! If we want positive values to be
      // higher than negative ones, we must flip their
      // signs.
      y = scaleLinear().domain([valueMin, valueMax]).range([height, 0]);

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
        debouncedOnChange(theValueOverTimeArray.slice());
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
      //console.log(theValueOverTimeArray);
      requestAnimationFrame(drawValues);
      if (strokeTimeInEvents >= maxEventCountForStroke) {
      //console.log('Forcing stroke commit', strokeTimeInEvents);
        debouncedOnChange(theValueOverTimeArray.slice());
        strokeTimeInEvents = 0;
      }
    }

    // We need to interpolate to fill in gaps in the array.
    function fillToPoint(index, val) {
      const anchorVal = theValueOverTimeArray[lastIndexFilled];
      const fillDirection = index > lastIndexFilled ? 1 : -1;
      for (let interpIndex = lastIndexFilled; interpIndex !== index; interpIndex += fillDirection) {
      // This can be something fancier than linear, if it helps.
        const interpVal = anchorVal + (interpIndex - lastIndexFilled)/(index - lastIndexFilled) * (val - anchorVal);
        theValueOverTimeArray[interpIndex] = interpVal;
      }
      theValueOverTimeArray[index] = val;
      lastIndexFilled = index;
    }

    function drawValues() {
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.fillRect(0, 0, width, height);

      for (let i = 0; i < theValueOverTimeArray.length; ++i) {
        const xTime = x(i);
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = lineColor;
        canvasCtx.moveTo(xTime, y(theValueOverTimeArray[i]));
        canvasCtx.lineTo(xTime, height);
        canvasCtx.stroke();
      }

    }
  }
}
