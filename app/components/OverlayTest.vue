<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useExperience } from "~/composables/useExperience";
import CreditsPopin from "./ui/CreditsPopin.vue";
import Header from "./ui/Header.vue";
import InfoInteraction from "./ui/InfoInteraction.vue";
import Loader from "./ui/Loader.vue";

const ui = useExperienceStore();
const { nextScene, start } = useExperience();
const { displayNext, hasStarted, isReady, isPrebuilded, displayRestart } =
  storeToRefs(ui);
const canShowNext = computed(() => displayNext.value);

const creditsOpen = ref(false);

const restart = () => {
  window.location.reload();
};
</script>

<template>
  <Transition name="loader-fade">
    <Loader v-show="!isReady" />
  </Transition>
  <div class="wrapper">
    <Header class="header" />
    <Transition name="fade">
      <CTAButton
        v-show="canShowNext"
        label="suivant"
        class="cta"
        @click="nextScene"
      />
    </Transition>

    <Transition name="fade">
      <CTAButton
        v-show="!hasStarted && isReady && isPrebuilded"
        label="commencer l'expérience"
        class="start-cta"
        @click="start"
      />
    </Transition>

    <Transition name="fade">
      <CTAButton
        v-show="displayRestart"
        label="recommencer"
        class="restart-cta"
        :icon="'restart'"
        @click="restart"
      />
    </Transition>

    <Transition name="fade">
      <CTAButton
        v-show="displayRestart && !creditsOpen"
        label="credits"
        class="cta"
        :icon="'chevron-left'"
        @click="creditsOpen = true"
      />
    </Transition>

    <CreditsPopin v-if="creditsOpen" @close="creditsOpen = false" />

    <InfoInteraction />
  </div>
</template>

<style scoped lang="scss">
.wrapper {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--gap-l);

  .cta {
    position: absolute;
    bottom: var(--grid-margin);
    right: var(--grid-margin);
    pointer-events: auto;
  }

  .start-cta,
  .restart-cta {
    position: absolute;
    pointer-events: auto;
    top: calc(50% + global.rem(150));
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
