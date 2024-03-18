import { ScoreState } from 'synthskel/types';
import { select } from 'd3-selection';

var monthLabel = select('.month');
var yearLabel = select('.year');
var tideGaugeLevelLabel = select('.tide-gauge-level');

export function renderVisualizationForTick(scoreState: ScoreState) {
  var monthDatum = scoreState?.meta?.sourceDatum;
  if (monthDatum) {
    let date = new Date(monthDatum.date);
    // @ts-ignore
    const month = date.toLocaleString({}, { month: 'long' });
    monthLabel.text(month);
    yearLabel.text(monthDatum.year);
    tideGaugeLevelLabel.text(monthDatum.value);
  }
}
