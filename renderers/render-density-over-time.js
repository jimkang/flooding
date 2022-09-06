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
    // TODO: maxHarshness, maxBoredom consts.
    var yHarshness = scaleLinear().domain([0, 10]).range([0, height]);
    var yBoredom = scaleLinear().domain([0, 10]).range([0, height]);

    requestAnimationFrame(drawValues);
    
    function drawValues() {
      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.fillRect(0, 0, width, height);
      canvasCtx.fillStyle = color;
  
      var barX = 0;
      var prevBarX = 0;
      eventDirectionObjects.forEach(drawDirectionObject);

      function drawDirectionObject({ tickLength, chordSize, chord }, i) {
        const barWidth = x(tickLength);
        const barHeight = y(chordSize);
        canvasCtx.fillRect(barX, height - barHeight, barWidth, barHeight);
        prevBarX = barX;
        barX += barWidth;
      
        if (i > 0) {
          let prevChord = eventDirectionObjects[i - 1].chord;
          canvasCtx.strokeStyle = 'orange';
          canvasCtx.moveTo(prevBarX, yHarshness(prevChord.meta.harshnessBattery));
          canvasCtx.lineTo(barX, yHarshness(chord.meta.harshnessBattery));
          canvasCtx.stroke();
           
          canvasCtx.strokeStyle = 'white';
          canvasCtx.moveTo(prevBarX, yBoredom(prevChord.meta.boredomBattery));
          canvasCtx.lineTo(barX, yHarshness(chord.meta.boredomBattery));
          //canvasCtx.stroke();
        }
      }
    }
  }
}
