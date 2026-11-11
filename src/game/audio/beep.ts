let context: AudioContext | undefined;

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
};
