import { VoiceLanguageCode, VoiceVerdictType, formatVoiceScript } from "@qraksha/shared";
import { getVoiceVerdict } from "./api";

export type VoiceState = "idle" | "thinking" | "speaking" | "error";

export interface VoicePlayerCallbacks {
  onStateChange: (state: VoiceState) => void;
  onAmplitudeChange?: (amplitude: number) => void; // 0.0 to 1.0
  onError?: (error: Error) => void;
}

export class VoicePlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private animationFrameId: number | null = null;
  private isSynthesizing = false;
  private isSpeaking = false;
  private callbacks: VoicePlayerCallbacks;

  constructor(callbacks: VoicePlayerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Must be called on a user gesture (e.g. scan tap or check tap)
   * to prime the Web Audio context and satisfy browser autoplay security.
   */
  public primeAudioContext(): void {
    if (typeof window === "undefined") return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;

      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {
      // AudioContext unavailable
    }
  }

  /**
   * Stops any ongoing playback or synthesis immediately.
   */
  public stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {
        // Source already stopped
      }
      this.currentSource = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // SpeechSynthesis cancellation
      }
    }

    this.isSpeaking = false;
    this.isSynthesizing = false;
    this.callbacks.onStateChange("idle");
    this.callbacks.onAmplitudeChange?.(0);
  }

  /**
   * Plays the audio verdict.
   * Priority:
   * 1. Sarvam Bulbul TTS via backend API (with Web Audio Analyser for real amplitude sync)
   * 2. Browser SpeechSynthesis API fallback in matching Indic language
   * 3. Degrades safely to visual display only without blocking UI
   */
  public async playVerdict(
    verdict: VoiceVerdictType,
    lang: VoiceLanguageCode,
    merchantDisplayName?: string
  ): Promise<void> {
    this.stop();
    this.primeAudioContext();

    this.isSynthesizing = true;
    this.callbacks.onStateChange("thinking");

    try {
      // 1. Attempt server-side Sarvam synthesis
      const res = await getVoiceVerdict({
        verdict,
        lang,
        merchantDisplayName,
      });

      if (!this.isSynthesizing) {
        // User aborted during fetch
        return;
      }

      await this.playSarvamAudio(res.audioBase64);
    } catch (_sarvamErr) {
      // 2. Fail-Safe: Fall back to browser SpeechSynthesis in the requested language
      try {
        const fallbackText = formatVoiceScript(verdict, lang, merchantDisplayName);
        await this.playSpeechSynthesisFallback(fallbackText, lang);
      } catch (_speechErr) {
        // 3. Fallback error state
        this.isSpeaking = false;
        this.isSynthesizing = false;
        this.callbacks.onStateChange("error");
      }
    }
  }

  /**
   * Plays base64 WAV audio through Web Audio API with real amplitude visualization.
   */
  private async playSarvamAudio(base64Wav: string): Promise<void> {
    if (!this.audioCtx) {
      this.primeAudioContext();
    }

    if (!this.audioCtx) {
      throw new Error("AudioContext not supported");
    }

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Decode base64 to binary ArrayBuffer
    const binaryString = atob(base64Wav);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBuffer = await this.audioCtx.decodeAudioData(bytes.buffer.slice(0));

    const source = this.audioCtx.createBufferSource();
    source.buffer = audioBuffer;

    const analyser = this.audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;

    source.connect(analyser);
    analyser.connect(this.audioCtx.destination);

    this.currentSource = source;
    this.analyser = analyser;
    this.isSynthesizing = false;
    this.isSpeaking = true;
    this.callbacks.onStateChange("speaking");

    // Start amplitude monitoring loop
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const updateAmplitude = () => {
      if (!this.isSpeaking || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalized = Math.min(1.0, avg / 128); // 0 to 1

      this.callbacks.onAmplitudeChange?.(normalized);
      this.animationFrameId = requestAnimationFrame(updateAmplitude);
    };

    updateAmplitude();

    source.onended = () => {
      this.stop();
    };

    source.start(0);
  }

  /**
   * Fallback using browser's native SpeechSynthesis API.
   * Simulates rhythmically pulsing amplitude for the orb.
   */
  private playSpeechSynthesisFallback(
    text: string,
    lang: VoiceLanguageCode
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return reject(new Error("SpeechSynthesis not supported"));
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang; // 'hi-IN', 'kn-IN', 'en-IN'
      utterance.rate = 0.95;

      this.isSynthesizing = false;
      this.isSpeaking = true;
      this.callbacks.onStateChange("speaking");

      // Rhythmic fixed pulse simulation for fallback
      const startTime = performance.now();
      const pulseLoop = (time: number) => {
        if (!this.isSpeaking) return;
        const elapsed = (time - startTime) / 1000;
        // 2.5Hz sine wave oscillation between 0.2 and 0.8
        const amplitude = 0.5 + 0.3 * Math.sin(elapsed * 2.5 * Math.PI);
        this.callbacks.onAmplitudeChange?.(amplitude);
        this.animationFrameId = requestAnimationFrame(pulseLoop);
      };
      this.animationFrameId = requestAnimationFrame(pulseLoop);

      utterance.onend = () => {
        this.stop();
        resolve();
      };

      utterance.onerror = (e) => {
        this.stop();
        reject(e);
      };

      window.speechSynthesis.speak(utterance);
    });
  }
}
