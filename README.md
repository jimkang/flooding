# flooding

## Sources

[meta/ohc_levitus_climdash_seasonal.csv] (units: 10^22 joules) is from the [NCEI  Heat Content Basin Time Series](https://www.ncei.noaa.gov/access/global-ocean-heat-content/basin_heat_data.html) (at the World, 0 - 700, all months link), which comes from [World Ocean Heat Content and Thermosteric Sea Level change (0-2000 m), 1955-2010](https://www.ncei.noaa.gov/data/oceans/woa/PUBLICATIONS/grlheat12.pdf).

## Getting it running

Once you have this source code on your computer, you can get it running by doing the following.

- Install [Node 10 or later](https://nodejs.org/).
- From the root directory of the project (the same one this README file is in), run this command: `npm i`
- Then, run `make run`. It should then say something like `Your application is ready~! Local: http://0.0.0.0:7000`
  - On Windows, you may not have `make`. In that case, you can run `npm run dev`.
  - Go to `http://0.0.0.0:7000` (or `http://localhost:7000`) in your browser. The web app will be running there.
