export function Ticker({
  onTick,
  startTick,
  onPause,
  onResume,
  totalTicks,
  getTickLength
}) {
  var ticks = 0;
  startTick = +startTick;
  if (!isNaN(startTick) && startTick > -1) {
    ticks = startTick;
  }

  var timeoutKey;
  var currentTickLengthSeconds = 1;

  return {
    getTicks,
    setTicks,
    pause,
    resume,
    isPaused,
    getCurrentTickLength,
  };


  function getTicks() {
    return ticks;
  }

  function setTicks(val) {
    ticks = Math.round(val);
    onTick({ ticks, currentTickLengthSeconds });
  }

  function pause() {
    clearTimeout(timeoutKey);
    timeoutKey = null;
    if (onPause) {
      onPause();
    }
  }

  function resume() {
    if (!timeoutKey) {
      tick();
    }
    if (onResume) {
      onResume();
    }
  }

  function tick() {
    // Don't update tick length anywhere else.
    if (getTickLength) {
      currentTickLengthSeconds = getTickLength(ticks);
    }
    onTick({ ticks, currentTickLengthSeconds });
    ticks += 1;
    if (ticks >= totalTicks) {
      return;
    }

    timeoutKey = setTimeout(tick, currentTickLengthSeconds * 1000);
  }

  function isPaused() {
    return !timeoutKey;
  }

  function getCurrentTickLength() {
    return currentTickLengthSeconds;
  }
}

