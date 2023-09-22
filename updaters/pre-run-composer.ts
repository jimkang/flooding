import { range } from 'd3-array';
import { ScoreState } from 'synthskel/types';

export function preRunComposer({ composer, totalTicks }): ScoreState[] {
  return range(totalTicks).map(composer.getScoreState);
}
