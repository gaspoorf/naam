import { defineStore } from "pinia";
import type { CursorState } from "~/types/cursor";
import type { InteractionIconType } from "~/types/ui";

export const useExperienceStore = defineStore("experience", {
  state: () => ({
    loaderProgress: 0,
    isReady: false,
    isPrebuilded: false,
    isTransitioning: false,
    currentSceneIndex: 0,
    displayNext: false,
    displayRestart: false,
    hasStarted: false,
    infoInteractionIcon: null as InteractionIconType | null,
    infoText: null as string | null,
    popinText: null as string | null,
    titleText: null as string | null,
    cursorState: "base" as CursorState,
    holdProgress: 0,
  }),

  actions: {
    setReady(value: boolean) {
      this.isReady = value;
    },

    setPrebuilded(value: boolean) {
      this.isPrebuilded = value;
    },

    setLoaderProgress(value: number) {
      this.loaderProgress = value;
    },

    setTransitioning(value: boolean) {
      this.isTransitioning = value;
    },

    setStarted(value: boolean) {
      this.hasStarted = value;
    },

    setCurrentSceneIndex(index: number) {
      this.currentSceneIndex = index;
    },

    setDisplayNext(value: boolean) {
      this.displayNext = value;
    },

    setDisplayRestart(value: boolean) {
      this.displayRestart = value;
    },

    setInfoText(value: string | null) {
      this.infoText = value;
    },

    setInfoInteractionIcon(value: InteractionIconType | null) {
      this.infoInteractionIcon = value;
    },

    setPopinText(value: string | null) {
      this.popinText = value;
    },

    setTitleText(value: string | null) {
      this.titleText = value;
    },

    setCursorState(value: CursorState) {
      this.cursorState = value;
    },

    setHoldProgress(value: number) {
      this.holdProgress = value;
    },
  },
});
