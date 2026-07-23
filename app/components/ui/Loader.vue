<script setup lang="ts">
import { computed } from "vue";
import { useExperienceStore } from "~/stores/experience";
import SpiralLogo from "../icons/SpiralLogo.vue";

const store = useExperienceStore();

const loaderProgress = computed(() => store.loaderProgress);
</script>

<template>
  <div class="loader">
    <p class="progress">{{ Math.ceil(loaderProgress * 100) }}%</p>
    <SpiralLogo class="logo" />
  </div>
</template>

<style scoped lang="scss">
.loader {
  position: fixed;
  inset: 0;
  z-index: 50;
  background-color: var(--color-dark);
  display: flex;
  flex-direction: column;
  justify-content: end;
  padding: var(--grid-margin);

  .progress {
    @include style.apply(display);
  }

  .logo {
    position: absolute;
    z-index: -1;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 110vw;
    height: auto;
    color: var(--color-dark-l1);
  }
}
</style>
