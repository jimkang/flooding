import { scaleLinear } from 'd3-scale';
import { tonalityDiamondPitches } from '../tonality-diamond';

export function RenderDensityOverTime({ canvasId, color = 'green' }) {
  var canvas = document.getElementById(canvasId);
  var canvasCtx = canvas.getContext('2d', { alpha: false });
  canvasCtx.lineWidth = 1;
  const width = +canvas.getAttribute('width');
  const height = +canvas.getAttribute('height');

  return renderDensityOverTime;

  function renderDensityOverTime({ eventDirectionObjects }) {
    const totalTime = eventDirectionObjects.reduce(
      (total, direction) => total + direction.tickLength,
      0
    );
    var x = scaleLinear().domain([0, totalTime]).range([0, width]);
    var y = scaleLinear().domain([0, tonalityDiamondPitches.length]).range([0, height]);

    requestAnimationFrame(drawValues);
    
    function drawValues() {
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.fillRect(0, 0, width, height);
      canvasCtx.fillStyle = color;
  
      var barX = 0;
      eventDirectionObjects.forEach(drawDirectionObject);

      function drawDirectionObject({ tickLength, chordSize }) {
        const barWidth = x(tickLength);
        const barHeight = y(chordSize);
        canvasCtx.fillRect(barX, height - barHeight, barWidth, barHeight);
        barX += barWidth;
      }
    }
  }
}
