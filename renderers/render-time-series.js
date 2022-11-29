import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

export function RenderTimeSeries({ canvasId, color = 'green' }) {
  var canvas = document.getElementById(canvasId);
  const width = +canvas.getAttribute('width');
  const height = +canvas.getAttribute('height');
  var root = select(canvas).select('.root');

  return renderTimeSeriesCanvas;

  function renderTimeSeriesCanvas({
    valueOverTimeArray, totalTime, valueMin = 0, valueMax//, currentTick
  }) {
    var x = scaleLinear().domain([0, totalTime]).range([0, width]);
    var y = scaleLinear().domain([valueMin, valueMax]).range([0, height]);

    var bars = root.selectAll('.event-bar').data(valueOverTimeArray);
    bars.exit().remove();
    var newBars = bars.enter().append('rect').classed('event-bar', true);
    var currentBars = bars.merge(newBars);
    currentBars
      .attr('width', ed => x(ed.time))
      .attr('height', ed => y(ed.value))
      .attr('transform', getBarTransform);

    function getBarTransform(ed, i) {
      const left = x(getTotalTimeUpToIndex(i));
      const top = height - y(ed.value);
      return `translate(${left}, ${top})`;
    }

    function getTotalTimeUpToIndex(i) {
      return valueOverTimeArray.slice(0, i).reduce((total, ed) => ed.time + total, 0);
    }
  }
}
