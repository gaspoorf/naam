<script setup lang="ts">
import InfoIcon from "~/components/icons/InfoIcon.vue";
import SoundOffIcon from "~/components/icons/SoundOffIcon.vue";
import SoundOnIcon from "~/components/icons/SoundOnIcon.vue";
import InfoFillIcon from "../icons/InfoFillIcon.vue";
import SoundOffFillIcon from "../icons/SoundOffFillIcon.vue";
import SoundOnFillIcon from "../icons/SoundOnFillIcon.vue";
import Popin from "./Popin.vue";

const isSoundOn = ref(true);
const isOpen = ref(false);
const store = useExperienceStore();
const { muteSound } = useExperience();
const { isTransitioning, titleText, popinText } = storeToRefs(store);

function toggleSound() {
  isSoundOn.value = !isSoundOn.value;
  muteSound(!isSoundOn.value);
}
</script>

<template>
  <header class="header">
    <Transition name="fade">
      <button
        class="icon-button info-button"
        v-show="!isOpen && popinText"
        type="button"
        aria-label="Open info"
        @click="isOpen = true"
        @mouseenter="store.setCursorState('hover')"
        @mouseleave="store.setCursorState('base')"
      >
        <InfoIcon />
        <InfoFillIcon class="fill" />
      </button>
    </Transition>

    <Transition name="fade">
      <h2 v-show="!isTransitioning && titleText" class="title">
        {{ titleText }}
      </h2>
    </Transition>
    <button
      class="icon-button sound-button"
      type="button"
      :aria-label="isSoundOn ? 'Disable sound' : 'Enable sound'"
      @click="toggleSound"
      @mouseenter="store.setCursorState('hover')"
      @mouseleave="store.setCursorState('base')"
    >
      <div class="inner" v-if="isSoundOn" key="sound-on">
        <SoundOnIcon />
        <SoundOnFillIcon class="fill" />
      </div>
      <div class="inner" v-else key="sound-off">
        <SoundOffIcon />
        <SoundOffFillIcon class="fill" />
      </div>
    </button>
    <Popin
      v-if="isOpen && popinText"
      :text="popinText"
      @close="isOpen = false"
    />
  </header>
</template>

<style scoped lang="scss">
.header {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 20;
  // display: flex;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(global.rem(32) * 3);
  pointer-events: none;
  padding: var(--grid-margin);
  font-family: var(--main-font);
}

.title {
  @include style.apply(uppercase);
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

// BUTTONS
.icon-button {
  position: absolute;
  width: var(--icon-size-l);
  height: var(--icon-size-l);
  color: var(--color-off-white);
  border-radius: var(--radius-full);
  pointer-events: auto;

  .fill {
    position: absolute;
    top: 0;
    left: 0;
    transform: scale(0);
    transform-origin: center;
    opacity: 0;
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
  }

  &:hover .fill {
    transform: scale(1);
    opacity: 1;
  }
}

.icon-button:active {
  transform: scale(0.96);
}

// INFO BUTTON
.info-button {
  left: var(--grid-margin);
  transition: opacity 0.3s ease;

  &.close {
    opacity: 0;
    pointer-events: none;
  }
}

// SOUND BUTTON
.sound-button {
  right: var(--grid-margin);
  justify-self: end;
}
</style>
