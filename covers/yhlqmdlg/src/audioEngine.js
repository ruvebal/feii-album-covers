// covers/yhlqmdlg/src/audioEngine.js — Hybrid Audio Engine for YHLQMDLG.
// 1. Fetches official 30-second previews from the iTunes Search API (collectionId: 1500776322)
//    with CORS enabled so a Web Audio API AnalyserNode can extract real-time sub-bass energy (`uBass`).
// 2. If offline or if a preview is blocked, falls back seamlessly to a procedural Web Audio API
//    dembow/retro synthesizer clocked to the selected track's BPM.
// 3. Disposes all audio nodes, timers, and network requests cleanly when the route unmounts.

import { ALBUM_META, TRACKS } from './tracks.js';

const LOOKUP_URL = `https://itunes.apple.com/lookup?id=${ALBUM_META.itunesCollectionId}&entity=song`;

export function createYhlqmdlgAudio({ onStateChange }) {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'none';

  const previewUrls = new Array(TRACKS.length).fill(null);
  const aborter = new AbortController();

  let ctx = null;
  let analyser = null;
  let mediaSource = null;
  let gainNode = null;
  let freqBins = null;

  let activeTrackIndex = -1;
  let isPlaying = false;
  let usingSynthFallback = false;
  let synthTimer = null;
  let synthBeatStep = 0;
  let synthPulse = 0;

  // Fetch 30s preview URLs from Apple Music / iTunes API
  fetch(LOOKUP_URL, { signal: aborter.signal })
    .then((res) => res.json())
    .then((data) => {
      if (!data || !Array.isArray(data.results)) return;
      for (const item of data.results) {
        if (item.wrapperType === 'track' && item.previewUrl && item.trackNumber >= 1 && item.trackNumber <= 20) {
          previewUrls[item.trackNumber - 1] = item.previewUrl;
        }
      }
      notify();
    })
    .catch(() => {
      // Offline or blocked: procedural Web Audio synth fallback remains available
    });

  function notify() {
    onStateChange?.({
      trackIndex: activeTrackIndex,
      isPlaying,
      mode: usingSynthFallback ? 'synth' : 'preview',
      hasPreview: activeTrackIndex >= 0 ? Boolean(previewUrls[activeTrackIndex]) : false,
    });
  }

  function ensureAudioGraph() {
    if (ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = new AudioCtx();
    gainNode = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.72;
    freqBins = new Uint8Array(analyser.frequencyBinCount);

    try {
      mediaSource = ctx.createMediaElementSource(audio);
      mediaSource.connect(gainNode);
    } catch {
      // Fallback if mediaSource fails
    }
    gainNode.connect(analyser);
    analyser.connect(ctx.destination);
  }

  function stopSynthLoop() {
    if (synthTimer) {
      clearInterval(synthTimer);
      synthTimer = null;
    }
    synthPulse = 0;
  }

  function triggerSynthStep(bpm, tint) {
    if (!ctx) return;
    const now = ctx.currentTime;
    const step = synthBeatStep % 8;
    synthBeatStep += 1;

    // Dembow kick pattern on steps 0, 3, 4, 6
    const isKick = step === 0 || step === 4;
    const isSnare = step === 3 || step === 6;

    if (isKick) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(115, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
      env.gain.setValueAtTime(0.45, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(env);
      env.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.19);
      synthPulse = 1.0;
    } else if (isSnare) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 180 + (tint[0] * 60 + tint[2] * 40);
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.09);
      env.gain.setValueAtTime(0.24, now);
      env.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      osc.connect(env);
      env.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.12);
      synthPulse = 0.72;
    }
  }

  function startSynthFallback(index) {
    stopSynthLoop();
    usingSynthFallback = true;
    isPlaying = true;
    synthBeatStep = 0;
    const track = TRACKS[index] || TRACKS[0];
    const stepMs = Math.max(110, Math.round((60 / track.bpm / 2) * 1000));
    triggerSynthStep(track.bpm, track.tint);
    synthTimer = setInterval(() => {
      triggerSynthStep(track.bpm, track.tint);
    }, stepMs);
    notify();
  }

  async function playTrack(index) {
    ensureAudioGraph();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    stopSynthLoop();
    audio.pause();

    activeTrackIndex = index;
    const url = previewUrls[index];

    if (url) {
      usingSynthFallback = false;
      audio.src = url;
      gainNode.gain.setValueAtTime(0.85, ctx.currentTime);
      try {
        await audio.play();
        isPlaying = true;
        notify();
        return;
      } catch {
        // Fallback to procedural dembow synth if preview playback fails
      }
    }

    startSynthFallback(index);
  }

  function pause() {
    stopSynthLoop();
    audio.pause();
    isPlaying = false;
    notify();
  }

  function toggleTrack(index) {
    if (activeTrackIndex === index && isPlaying) {
      pause();
    } else {
      playTrack(index);
    }
  }

  const handleEnded = () => {
    isPlaying = false;
    notify();
  };

  audio.addEventListener('ended', handleEnded);

  function getBassEnergy() {
    if (!isPlaying) return 0;
    if (usingSynthFallback) {
      synthPulse *= 0.88;
      return synthPulse;
    }
    if (!analyser || !freqBins) return 0;
    analyser.getByteFrequencyData(freqBins);
    let sum = 0;
    const binsToRead = 8;
    for (let i = 0; i < binsToRead; i += 1) {
      sum += freqBins[i];
    }
    const avg = sum / (binsToRead * 255);
    return Math.min(1, Math.max(0, (avg - 0.25) / 0.65));
  }

  function destroy() {
    aborter.abort();
    stopSynthLoop();
    audio.removeEventListener('ended', handleEnded);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    isPlaying = false;
    if (ctx) {
      ctx.close().catch(() => {});
      ctx = null;
    }
  }

  return {
    playTrack,
    pause,
    toggleTrack,
    getBassEnergy,
    destroy,
  };
}
