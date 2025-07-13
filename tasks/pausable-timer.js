export function PausableTimer(name) {
  var state = {
    elapsed: 0,
    paused: false,
    lastTime: performance.now(),
    cancelKey: requestAnimationFrame(update),
  };
  console.log('Created new', name, 'timer.');

  return {
    pause,
    resume,
    getElapsed,
    getPaused,
    end,
  };

  function update(timestamp) {
    // console.log('state', state);
    if (state.paused) {
      console.log(name, 'Skipping update.');
      return;
    }
    const elapsedDelta = timestamp - state.lastTime;
    // console.log(name, 'elapsedDelta', elapsedDelta.toFixed(2));

    // if (elapsedDelta < 0) {
    //   console.log(name, 'Negative elapsedDelta', elapsedDelta);
    // } else {
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
    console.log(name, 'Pausing');
    state.paused = true;
    cancelAnimationFrame(state.cancelKey);
  }

  function resume() {
    if (!state.paused) {
      return;
    }
    console.log(name, 'Resuming');
    state.paused = false;
    state.lastTime = performance.now();
    state.cancelKey = requestAnimationFrame(update);
  }

  function getElapsed() {
    return state.elapsed;
  }

  function getPaused() {
    return state.paused;
  }

  function end() {
    cancelAnimationFrame(state.cancelKey);
  }
}
