let context: AudioContext | undefined;

/**
 * Phone browsers keep audio muted until it is started from a touch or key press, so the
 * first one creates (or wakes) the context before any blip needs it.
 */
export function unlockAudioOnFirstInput(): void {
  const unlock = (): void => {
    try {
      context ??= new AudioContext();
      if (context.state === "suspended") void context.resume();
    } catch {
      return;
    }
    if (context.state === "running") {
      for (const type of ["touchend", "pointerdown", "keydown"]) {
        window.removeEventListener(type, unlock, true);
      }
    }
  };
  for (const type of ["touchend", "pointerdown", "keydown"]) {
    window.addEventListener(type, unlock, true);
  }
}

function beep(freq: number, ms: number): void {
  try {
    context ??= new AudioContext();
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + ms / 1000);
  } catch {
    // Audio is optional.
  }
}

export const sfx = {
  paddle: () => beep(490, 40),
  wall: () => beep(245, 40),
  score: () => beep(245, 260),
  transform: () => beep(980, 30),
  upgrade: () => beep(740, 300),
  stick: () => beep(160, 80),
  fire: () => beep(120, 120),
  dissolve: () => beep(330, 60),
};
