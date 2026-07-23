// SoundManager.ts
import gsap from "gsap";
import { Howl, Howler } from "howler";
import type { SoundSource } from "~/types/sounds";
import type { SoundName } from "../sounds";
import { EventEmitter } from "./EventEmitter";

type SoundItems = Record<SoundName, Howl>;

export default class SoundManager extends EventEmitter {
  declare sources: readonly SoundSource[];
  declare items: Partial<SoundItems>;
  declare toLoad: number;
  declare loaded: number;
  private filter: BiquadFilterNode | null = null;

  constructor(sources: readonly SoundSource[]) {
    super();

    this.sources = sources;
    this.items = {};
    this.toLoad = this.sources.length;
    this.loaded = 0;

    this.startLoading();
  }

  startLoading() {
    if (this.toLoad === 0) {
      this.trigger("ready");
      return;
    }

    for (const source of this.sources) {
      const originalOnLoad = source.options?.onload;
      const originalOnLoadError = source.options?.onloaderror;

      const sound = new Howl({
        src: source.path,
        ...source.options,

        onload: (soundId) => {
          originalOnLoad?.(soundId);
          this.soundLoaded();
        },

        onloaderror: (soundId, error) => {
          originalOnLoadError?.(soundId, error);
          console.warn(
            `[SoundManager] Failed to load sound "${source.name}"`,
            error,
          );
          this.soundLoaded();
        },
      });

      const name = source.name as SoundName;
      this.items[name] = sound;
    }
  }

  soundLoaded() {
    this.loaded++;

    if (this.loaded === this.toLoad) {
      this.trigger("ready");
      this.applyFilter();
      this.items.ambient?.play();
    }
  }

  play(name: SoundName, delay: number = 0) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return null;
    }

    gsap.delayedCall(delay, () => {
      sound.play();
    });
  }

  playRate(name: SoundName, rate: number): number | null {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return null;
    }

    sound.rate(rate);
    return sound.play();
  }

  pause(name: SoundName) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return;
    }

    sound.pause();
  }

  stop(name: SoundName) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return;
    }

    sound.stop();
  }

  mute(name: SoundName, muted = true) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return;
    }

    sound.mute(muted);
  }

  reset(name: SoundName) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return;
    }

    sound.stop();
    sound.seek(0);
  }

  setVolume(name: SoundName, volume: number) {
    const sound = this.items[name];

    if (!sound) {
      console.warn(`[SoundManager] Sound "${name}" not found.`);
      return;
    }

    sound.volume(volume);
  }

  setGlobalVolume(volume: number) {
    Howler.volume(volume);
  }

  muteAll(muted = true) {
    Howler.mute(muted);
    this.items.ambient?.mute(muted);
  }

  stopAll() {
    Howler.stop();
  }

  // MUFFLE
  private applyFilter() {
    const ctx = Howler.ctx;
    const sound: any = (this.items.ambient as any)._sounds?.[0];
    if (!sound || !sound._node) return;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = "lowpass";
    this.filter.frequency.value = 150;
    const source = sound._node;
    source.disconnect();
    source.connect(this.filter);
    this.filter.connect(ctx.destination);
  }

  public animateFilterRelease() {
    if (!this.filter) return;
    const now = Howler.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
    this.filter.frequency.linearRampToValueAtTime(20000, now + 10);
  }

  public animateFilterEngage() {
    if (!this.filter) return;
    const now = Howler.ctx.currentTime;
    this.filter.frequency.cancelScheduledValues(now);
    this.filter.frequency.setValueAtTime(this.filter.frequency.value, now);
    this.filter.frequency.linearRampToValueAtTime(150, now + 1.5);
  }
}
