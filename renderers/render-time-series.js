import { scaleLinear } from 'd3-scale';

export function RenderTimeSeries({ canvasId, color = 'green' }) {
  var canvas = document.getElementById(canvasId);
  var canvasCtx = canvas.getContext('2d', { alpha: false });
  canvasCtx.lineWidth = 1;
  const width = +canvas.getAttribute('width');
  const height = +canvas.getAttribute('height');

  return renderTimeSeriesCanvas;

  function renderTimeSeriesCanvas({
    valueOverTimeArray, totalTime, valueMin = 0, valueMax, currentTick
  }) {
    var x = scaleLinear().domain([0, totalTime]).range([0, width]);
    var y = scaleLinear().domain([valueMin, valueMax]).range([0, height]);
    requestAnimationFrame(drawValues);

    function drawValues() {
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.fillStyle = color;
  
      var barX = 0;
      valueOverTimeArray.forEach(drawTimeSpan);

      function drawTimeSpan({ time, value }, i) {
        const barWidth = x(time);
        const barHeight = y(value);
        if (i === currentTick) {
          canvasCtx.fillStyle = 'hsl(60, 100%, 50%)';
        }
        canvasCtx.fillRect(barX, height - barHeight, barWidth, barHeight);
        if (i === currentTick) {
          canvasCtx.fillStyle = color;
        }
        barX += barWidth;
      }
    }
  }
}
