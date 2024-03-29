import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoomIdentity, zoom as Zoom } from 'd3-zoom';

var zoom;

export function RenderTimeSeries({
  canvasId,
  color = 'green',
  pauseWidth = 10,
}) {
  var canvas = select(document.getElementById(canvasId));
  const width = +canvas.attr('width');
  const height = +canvas.attr('height');
  var root = canvas.select('.root');
  wireZoom({ x: 0, y: 0, k: 1.0 });
  var graphInfoBox = select('.graph-info');

  return renderTimeSeriesCanvas;

  function renderTimeSeriesCanvas({
    valueOverTimeArray,
    totalTime,
    valueMin = 0,
    valueMax,
    currentTick,
  }) {
    var x = scaleLinear().domain([0, totalTime]).range([0, width]);
    var y = scaleLinear().domain([valueMin, valueMax]).range([0, height]);

    var bars = root.selectAll('.event-bar').data(valueOverTimeArray);
    bars.exit().remove();

    var newBars = bars.enter().append('rect').classed('event-bar', true);

    var currentBars = bars.merge(newBars);
    currentBars
      .attr('width', (ed) => x(ed.time) || pauseWidth)
      .attr('height', (ed) => y(ed.value) || 0)
      .attr('transform', getBarTransform)
      .attr('fill', (ed, i) => (i === currentTick ? 'white' : color))
      .on('click', renderEventInfo);

    function getBarTransform(ed, i) {
      const left = x(getTotalTimeUpToIndex(i));
      const top = height - y(ed.value) || 0;
      return `translate(${left}, ${top})`;
    }

    function getTotalTimeUpToIndex(i) {
      return valueOverTimeArray
        .slice(0, i)
        .reduce((total, ed) => (ed.time || pauseWidth) + total, 0);
    }
  }

  function wireZoom({ x, y, k }) {
    zoom = Zoom().scaleExtent([1, 32]).on('zoom', zoomed);
    canvas.call(zoom.transform, zoomIdentity.translate(x, y).scale(k));
    canvas.call(zoom);

    function zoomed(zoomEvent) {
      root.attr('transform', zoomEvent.transform);
    }
  }

  function renderEventInfo(e, { time, value }) {
    graphInfoBox.style('background-color', color);
    graphInfoBox.selectAll('*').remove();
    graphInfoBox.append('div').text('Time: ' + time);
    graphInfoBox.append('div').text('Value: ' + value);
  }
}
