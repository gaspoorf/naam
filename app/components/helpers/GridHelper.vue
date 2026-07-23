<script setup lang="ts">
import { ref } from "vue";

const enabled = ref(false);

const toggleGrid = () => {
  enabled.value = !enabled.value;
  localStorage.setItem("grid-helper", enabled.value.toString());
};

const handleKeyDown = (event: KeyboardEvent) => {
  const isGKey =
    event.code === "KeyG" || (event.key && event.key.toLowerCase() === "g");
  if (isGKey && event.shiftKey) {
    toggleGrid();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="gridHelper" :class="{ visible: enabled }">
    <div v-for="n in 12" :key="n" class="gridHelperCol" />
  </div>
</template>

<style scoped lang="scss">
.gridHelper {
  position: fixed;
  z-index: 99999;
  top: 0;
  left: 0;
  display: grid;
  width: var(--vw);
  height: 100vh;
  padding: 0 var(--grid-margin);
  gap: var(--grid-gutter);
  grid-template-columns: repeat(12, 1fr);
  opacity: 1;
  pointer-events: none;
}

.gridHelperCol {
  background: red;
  transform: scaleY(0);
  transform-origin: bottom;
  opacity: 0.1;
  transition: transform 0.6s ease-in-out;
}

@for $i from 1 through 12 {
  .gridHelperCol:nth-child(#{$i}) {
    transition-delay: ($i - 1) * 0.05s;
  }
}

.visible {
  .gridHelperCol {
    transform-origin: top;
    transform: scaleY(1);
  }
}

@include mq.tablet-portrait {
  .gridHelper {
    grid-template-columns: repeat(6, 1fr);
  }

  .gridHelperCol:nth-child(n + 7) {
    display: none;
  }
}
</style>
