let ctx = null;
let ringGain = null;
let ringTimer = null;

function ensureCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

// Must be called from a user gesture so iOS/mobile browsers unlock audio.
export function prepareCallAudio() {
  return ensureCtx();
}

export function startRingback() {
  const c = ensureCtx();
  if (!c) return;
  stopRingback();
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 440;
  o2.type = 'sine';
  o2.frequency.value = 480;
  ringGain = c.createGain();
  ringGain.gain.value = 0;
  const master = c.createGain();
  master.gain.value = 0.12;
  o1.connect(ringGain);
  o2.connect(ringGain);
  ringGain.connect(master);
  master.connect(c.destination);
  o1.start();
  o2.start();
  const ring = () => {
    const t = c.currentTime;
    ringGain.gain.cancelScheduledValues(t);
    ringGain.gain.setValueAtTime(0.6, t);
    ringGain.gain.linearRampToValueAtTime(0, t + 2);
  };
  ring();
  ringTimer = setInterval(ring, 6000);
}

export function stopRingback() {
  if (ringTimer) {
    clearInterval(ringTimer);
    ringTimer = null;
  }
  if (ringGain && ctx) {
    try {
      ringGain.gain.cancelScheduledValues(ctx.currentTime);
      ringGain.gain.setValueAtTime(0, ctx.currentTime);
    } catch {
      /* ignore */
    }
  }
  ringGain = null;
}

export function playConnectBeep() {
  const c = ensureCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'sine';
  o.frequency.value = 800;
  g.gain.setValueAtTime(0.2, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.3);
}

export function stopAllAudio() {
  stopRingback();
  if (ctx) {
    try {
      ctx.close();
    } catch {
      /* ignore */
    }
    ctx = null;
  }
}
