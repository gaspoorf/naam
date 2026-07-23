<script setup lang="ts">
import { useExperience } from "~/composables/useExperience";

const canvas = ref<HTMLCanvasElement | null>(null);

const { mount, destroy } = useExperience();

onMounted(() => {
  if (!canvas.value) return;
  mount(canvas.value);
});

onBeforeUnmount(() => {
  destroy();
});
</script>

<template>
  <canvas ref="canvas" class="experience-canvas" />
</template>

<style scoped lang="scss">
.experience-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  transition: opacity 0.5s ease-out;

  &.hide {
    opacity: 0;
    pointer-events: none;
  }
}
</style>
