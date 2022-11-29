import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoomIdentity, zoom as Zoom } from 'd3-zoom';

var zoom;

export function RenderTimeSeries({ canvasId, color = 'green' }) {
  var canvas = select(document.getElementById(canvasId));
  const width = +canvas.attr('width');
  const height = +canvas.attr('height');
  var root = canvas.select('.root');
  wireZoom({ x: 0, y: 0, k: 1.0 });

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
 
  function wireZoom({ x, y, k }) {
    zoom = Zoom()
      .scaleExtent([1, 32])
      .on('zoom', zoomed);
    canvas.call(zoom.transform, zoomIdentity.translate(x, y).scale(k));
    canvas.call(zoom);
 
    function zoomed(zoomEvent) {
      root.attr('transform', zoomEvent.transform);
    }
  }
}

