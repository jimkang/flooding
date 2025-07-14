export function PausableTimer(name) {
  var state = {
    elapsed: 0,
    paused: false,
    lastTime: performance.now(),
    cancelKey: requestAnimationFrame(update),
    rate: 1.0,
  };
  console.log('Created new', name, 'timer.');

  return {
    pause,
    resume,
    getElapsed,
    isPaused,
    setRate,
    end,
    reset,
  };

  function update(timestamp) {
    // console.log('state', state);
    if (state.paused) {
      console.log(name, 'Skipping update.');
      return;
    }
    var elapsedDelta = timestamp - state.lastTime;
    // console.log(name, 'elapsedDelta', elapsedDelta.toFixed(2));

    if (elapsedDelta < 0) {
      console.log(name, 'Negative elapsedDelta', elapsedDelta);
      elapsedDelta = 0;
    }

    elapsedDelta *= state.rate;

    state.elapsed += elapsedDelta;
    state.lastTime = timestamp;
    // }
    // console.log('update: elapsed', state.elapsed);
    state.cancelKey = requestAnimationFrame(update);
  }

  function pause() {
    if (state.paused) {
      return;
    }
    console.log(name, 'pause Pausing');
    state.paused = true;
    cancelAnimationFrame(state.cancelKey);
  }

  function resume() {
    if (!state.paused) {
      return;
    }
    console.log(name, 'pause Resuming');
    state.paused = false;
    state.lastTime = performance.now();
    state.elapsed = 0;
    state.cancelKey = requestAnimationFrame(update);
  }

  function setRate(rate) {
    state.rate = rate;
  }

  function getElapsed() {
    return state.elapsed;
  }

  function isPaused() {
    return state.paused;
  }

  function end() {
    cancelAnimationFrame(state.cancelKey);
  }

  function reset() {
    state.lastTime = performance.now();
  }
}
