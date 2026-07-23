import { markRaw, shallowRef } from "vue";
import Experience from "~/libs/experience/Experience";
import type { CursorState } from "~/types/cursor";
import type { InteractionIconType } from "~/types/ui";

const experience = shallowRef<Experience | null>(null);

export function useExperience() {
  const store = useExperienceStore();

  function mount(canvas: HTMLCanvasElement) {
    if (experience.value) return;

    const instance = markRaw(new Experience(canvas));

    instance.events.on("scene:prebuilded", () => {
      store.setPrebuilded(true);
    });

    instance.events.on("ui:display-next", (payload: { value: boolean }) => {
      store.setDisplayNext(payload.value);
    });

    instance.events.on("end", () => {
      store.setDisplayRestart(true);
    });

    instance.events.on("ui:info-text", (payload: { value: string | null }) => {
      store.setInfoText(payload.value);
    });

    instance.events.on(
      "ui:info-interaction-icon",
      (payload: { value: InteractionIconType | null }) => {
        store.setInfoInteractionIcon(payload.value);
      },
    );

    instance.events.on("ui:popin-text", (payload: { value: string | null }) => {
      store.setPopinText(payload.value);
    });

    instance.events.on("ui:title-text", (payload: { value: string | null }) => {
      store.setTitleText(payload.value);
    });

    instance.events.on("ui:cursor", (payload: { value: CursorState }) => {
      store.setCursorState(payload.value);
    });

    instance.events.on("ui:hold-progress", (payload: { value: number }) => {
      store.setHoldProgress(payload.value);
    });

    instance.events.on("scene:changed", (payload: { index: number }) => {
      store.setCurrentSceneIndex(payload.index);
    });

    instance.events.on("scene:transitioning", (payload: { value: boolean }) => {
      store.setTransitioning(payload.value);
    });

    instance.resources.on("ready", () => {
      store.setReady(true);
    });

    instance.resources.on("progress", (payload: { value: number }) => {
      store.setLoaderProgress(payload.value);
    });

    experience.value = instance;
  }

  function nextScene() {
    experience.value?.sceneManager?.next();
    store.setDisplayNext(false);
  }

  function muteSound(value: boolean) {
    experience.value?.soundManager?.muteAll(value);
  }

  function start() {
    experience.value?.sceneManager.introScene.launchSequence();
    store.setStarted(true);
  }

  function destroy() {
    experience.value?.destroy();
    experience.value = null;
  }

  return {
    experience,
    mount,
    destroy,
    nextScene,
    muteSound,
    start,
  };
}
