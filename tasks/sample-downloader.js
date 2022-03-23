import { downloadSamples } from './download-samples';
import oknok from 'oknok';
import ContextKeeper from 'audio-context-singleton';

const cdnSampleBaseURL =
  'https://smidgeo.nyc3.cdn.digitaloceanspaces.com/flooding/samples';
const localSampleBaseURL = 'samples';

var { getCurrentContext } = ContextKeeper();

export function SampleDownloader({ sampleFiles, localMode, onComplete, handleError }) {
  var downloadStatus = {
    samplesDownloaded: false,
    sampleBuffers: null,
  };

  return { downloadStatus, startDownloads };

  function startDownloads() {
    getCurrentContext(oknok({ ok: useContext, nok: handleError }));
  }

  function useContext(ctx) {
    downloadSamples(
      {
        ctx,
        sampleFiles,
        baseURL: localMode ? localSampleBaseURL : cdnSampleBaseURL,
      },
      oknok({ ok: saveBuffers, nok: handleError })
    );
  }

  function saveBuffers(buffers) {
    downloadStatus.sampleBuffers = buffers;
    downloadStatus.samplesDownloaded = true;
    if (onComplete) {
      onComplete({ buffers });
    }
  }
}

