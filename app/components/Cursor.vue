<script setup lang="ts">
import CursorAsset from "~/components/cursor/CursorAsset.vue";

const store = useExperienceStore();
const cursorState = computed(() => store.cursorState);
const position = ref({ x: 0, y: 0 });
const targetPosition = ref({ x: 0, y: 0 });

function handleMouseMove(event: MouseEvent) {
  targetPosition.value.x = event.clientX;
  targetPosition.value.y = event.clientY;
}

function animate() {
  position.value = {
    x: lerp(position.value.x, targetPosition.value.x, 0.4),
    y: lerp(position.value.y, targetPosition.value.y, 0.4),
  };
  requestAnimationFrame(animate);
}

onMounted(() => {
  animate();
  window.addEventListener("mousemove", handleMouseMove, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener("mousemove", handleMouseMove);
});
</script>

<template>
  <div
    class="cursor"
    :style="{
      transform: `translate(calc(${position.x}px - 24px), calc(${position.y}px - 24px))`,
    }"
    aria-hidden="true"
  >
    <CursorAsset :state="cursorState" />
  </div>
</template>

<style scoped lang="scss">
.cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 40;
  width: global.rem(64);
  height: global.rem(64);
  pointer-events: none;
  will-change: transform;

  @media (pointer: coarse) {
    display: none;
  }
}
</style>
