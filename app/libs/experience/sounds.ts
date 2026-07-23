// sounds.ts
import type { SoundSource } from "~/types/sounds";

const sounds = [
  // MAIN AMBIENT
  {
    name: "ambient",
    path: "sounds/ambient.ogg",
    options: {
      volume: 3,
      loop: true,
    },
  },

  // SCENES AMBIENTS
  {
    name: "s1-ambient",
    path: "sounds/s1/s1-ambient.ogg",
    options: {
      volume: 0.3,
      loop: true,
    },
  },
  {
    name: "s2-ambient",
    path: "sounds/s2/s2-ambient.ogg",
    options: {
      volume: 0.5,
      loop: true,
    },
  },
  {
    name: "s3-ambient",
    path: "sounds/s3/s3-ambient.ogg",
    options: {
      volume: 0.5,
      loop: true,
    },
  },
  {
    name: "s4-ambient",
    path: "sounds/s4/s4-ambient.ogg",
    options: {
      volume: 0.5,
      loop: true,
    },
  },

  // TRANSITION
  {
    name: "transition",
    path: "sounds/transition.ogg",
    options: {
      volume: 0.4,
      html5: true,
    },
  },

  // SCENE 1
  {
    name: "s1sparkles",
    path: "sounds/s1/s1-sparkles.ogg",
    options: {
      volume: 3,
    },
  },
  {
    name: "stoneclick",
    path: "sounds/s1/s1-stone-click.ogg",
    options: {
      volume: 3,
    },
  },

  // SCENE 2
  {
    name: "s2-hold",
    path: "sounds/s2/s2-hold.ogg",
    options: {
      volume: 2.5,
    },
  },

  // SCENE 3
  {
    name: "s3-walking",
    path: "sounds/s3/s3-walking.ogg",
    options: {
      volume: 0.1,
    },
  },
  {
    name: "s3tree",
    path: "sounds/s3/s3-tree.ogg",
    options: {
      volume: 2,
    },
  },
  {
    name: "s3blink",
    path: "sounds/s3/s3-blink.ogg",
    options: {
      volume: 0.2,
    },
  },
  {
    name: "s3nerv",
    path: "sounds/s3/s3-nerv.ogg",
    options: {
      volume: 3,
    },
  },
  {
    name: "s3ground",
    path: "sounds/s3/s3-ground.ogg",
    options: {
      volume: 1,
    },
  },

  // SCENE 4
  {
    name: "s4-hold",
    path: "sounds/s4/s4-hold.ogg",
    options: {
      volume: 0.6,
    },
  },

  // VOICES
  {
    name: "voice-1",
    path: "sounds/voices/voice-1.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-2",
    path: "sounds/voices/voice-2.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-3",
    path: "sounds/voices/voice-3.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-4",
    path: "sounds/voices/voice-4.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-5",
    path: "sounds/voices/voice-5.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-6",
    path: "sounds/voices/voice-6.ogg",
    options: {
      volume: 1,
    },
  },
  {
    name: "voice-7",
    path: "sounds/voices/voice-7.ogg",
    options: {
      volume: 1,
    },
  },

  // OUTRO
  {
    name: "outro",
    path: "sounds/outro.ogg",
    options: {
      volume: 1,
    },
  },
] as const satisfies readonly SoundSource[];

export type SoundName = (typeof sounds)[number]["name"];

export default sounds;
