const animation = {"v":"5.12.2","fr":30,"ip":0,"op":30,"w":128,"h":128,"nm":"ArkCompat original probe","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Original probe","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":1,"k":[{"t":0,"s":[32,64,0],"e":[96,64,0],"i":{"x":[0.67],"y":[1]},"o":{"x":[0.33],"y":[0]}},{"t":29,"s":[96,64,0]}]},"a":{"a":0,"k":[0,0,0]},"s":{"a":0,"k":[100,100,100]}},"ao":0,"shapes":[{"ty":"el","p":{"a":0,"k":[0,0]},"s":{"a":0,"k":[56,56]},"nm":"Original circle","d":1},{"ty":"fl","c":{"a":0,"k":[0.12,0.55,0.95,1]},"o":{"a":0,"k":100},"r":1}],"ip":0,"op":30,"st":0,"bm":0}],"markers":[]};

const target = document.querySelector('#canvas-target');
const state = document.querySelector('#state');
const frameState = document.querySelector('#frame-state');
const eventLog = [];
const measurements = [];
const counts = {
  DOMLoaded: 0,
  enterFrame: 0,
  loopComplete: 0,
  complete: 0,
  segmentStart: 0,
  destroy: 0,
};

let playbackStarted = false;
let loopWindowStartMs = null;
let loopWindowLogged = false;
let fallbackAttempts = 0;
let destroyReturned = false;

function record(tier, kind, fields = {}) {
  const row = {
    eventId: `${kind}-${eventLog.length + 1}`,
    tier,
    kind,
    utc: new Date().toISOString(),
    monotonicMs: performance.now(),
    ...fields,
  };
  eventLog.push(row);
  return row;
}

function libraryEvent(name, fields = {}) {
  counts[name] += 1;
  return record('library-event', name, {
    sequence: counts[name],
    ...fields,
  });
}

function playerState() {
  return {
    isLoaded: animationItem.isLoaded,
    currentFrame: animationItem.currentFrame,
    currentRawFrame: animationItem.currentRawFrame,
    playCount: animationItem.playCount,
    totalFrames: animationItem.totalFrames,
  };
}

function startPlayback(trigger) {
  if (playbackStarted || !animationItem.isLoaded) {
    return;
  }
  playbackStarted = true;
  loopWindowStartMs = performance.now();
  record('caller-observation', 'playback_start', {
    trigger,
    ...playerState(),
  });
  animationItem.play();
}

function schedulePlaybackFallback() {
  const timer = setInterval(() => {
    if (playbackStarted || fallbackAttempts >= 20) {
      clearInterval(timer);
      return;
    }
    fallbackAttempts += 1;
    record('caller-observation', 'playback_fallback', {
      attempt: fallbackAttempts,
      ...playerState(),
    });
    if (animationItem.isLoaded) {
      state.textContent = 'loaded (isLoaded fallback)';
      startPlayback('isLoaded-fallback');
      clearInterval(timer);
    }
  }, 250);
}

function measureCanvas(captureId) {
  const canvas = target.querySelector('canvas');
  if (!canvas) {
    const missing = record('caller-observation', 'canvas_measurement', {
      captureId,
      canvasFound: false,
      ...playerState(),
    });
    measurements.push(missing);
    return missing;
  }

  const context = canvas.getContext('2d');
  const { width, height } = canvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let bluePixels = 0;
  let sumX = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      if (red < 80 && green > 80 && green < 200 && blue > 180) {
        bluePixels += 1;
        sumX += x;
      }
    }
  }

  const measurement = record('caller-observation', 'canvas_measurement', {
    captureId,
    canvasFound: true,
    canvasWidth: width,
    canvasHeight: height,
    bluePixels,
    meanX: bluePixels === 0 ? null : sumX / bluePixels,
    ...playerState(),
  });
  measurements.push(measurement);
  return measurement;
}

function pinFrame(frame) {
  const requestedAtMs = performance.now();
  const captureId = `pinned-${frame}-${requestedAtMs.toFixed(2)}`;
  record('caller-observation', 'frame_pin_request', {
    captureId,
    requestedFrame: frame,
    ...playerState(),
  });
  animationItem.goToAndStop(frame, true);
  frameState.textContent = `frame=${animationItem.currentFrame} rawFrame=${animationItem.currentRawFrame} ${Date.now()}`;
  record('caller-observation', 'frame_pin_selected', {
    captureId,
    requestedFrame: frame,
    ...playerState(),
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      measureCanvas(captureId);
      state.textContent = `frame ${frame} pinned`;
    });
  });
  return captureId;
}

function destroyAnimation() {
  record('caller-observation', 'destroy_request', {
    ...playerState(),
  });
  animationItem.destroy();
  destroyReturned = true;
  record('caller-observation', 'destroy_returned', {
    ...playerState(),
  });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      record('caller-observation', 'after_destroy', {
        canvasElementsAfterDestroy: target.querySelectorAll('canvas').length,
        destroyReturned,
      });
      state.textContent = 'destroy event observed';
    });
  });
}

const animationItem = lottie.loadAnimation({
  container: target,
  renderer: 'canvas',
  loop: true,
  autoplay: false,
  animationData: animation,
});

window.probe = {
  animation,
  animationItem,
  eventLog,
  measurements,
  counts,
  lottieVersion: lottie.version,
  record,
};

animationItem.addEventListener('DOMLoaded', () => {
  const event = libraryEvent('DOMLoaded', playerState());
  state.textContent = `loaded (${event.eventId})`;
  startPlayback(event.eventId);
});

animationItem.addEventListener('enterFrame', () => {
  if (counts.enterFrame < 10) {
    libraryEvent('enterFrame', playerState());
  }
});

animationItem.addEventListener('loopComplete', () => {
  const event = libraryEvent('loopComplete', {
    ...playerState(),
    elapsedMs: loopWindowStartMs === null ? null : performance.now() - loopWindowStartMs,
  });
  state.textContent = `loops=${event.sequence}`;
  if (event.sequence >= 10 && !loopWindowLogged) {
    loopWindowLogged = true;
    record('derived-observation', 'loop_window', {
      count: event.sequence,
      elapsedMs: loopWindowStartMs === null ? null : performance.now() - loopWindowStartMs,
    });
    state.textContent = `10 loops over ${Math.round(performance.now() - loopWindowStartMs)} ms`;
  }
});

animationItem.addEventListener('complete', () => {
  libraryEvent('complete', playerState());
});

animationItem.addEventListener('segmentStart', () => {
  libraryEvent('segmentStart', playerState());
});

animationItem.addEventListener('destroy', () => {
  libraryEvent('destroy', playerState());
  state.textContent = 'destroy event observed';
});

document.querySelector('#pause-frame-0').onclick = () => {
  pinFrame(0);
};
document.querySelector('#pause-frame-18').onclick = () => {
  pinFrame(18);
};
document.querySelector('#destroy').onclick = destroyAnimation;

schedulePlaybackFallback();
