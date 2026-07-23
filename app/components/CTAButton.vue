<script setup lang="ts">
import CTAIcon from "./icons/CTAIcon.vue";

defineProps<{
  label: string;
  icon?: "chevron-right" | "restart" | "chevron-left";
}>();

const store = useExperienceStore();
</script>

<template>
  <button
    class="cta-wrapper"
    @mouseenter="store.setCursorState('hover')"
    @mouseleave="store.setCursorState('base')"
    @click="store.setCursorState('base')"
  >
    <span class="label">{{ label }}</span>
    <CTAIcon :icon="icon" />
  </button>
</template>

<style scoped lang="scss">
.cta-wrapper {
  display: flex;
  align-items: center;
  gap: var(--gap-s);
  pointer-events: all;

  .label {
    @include style.apply(cta);
    text-wrap: nowrap;
  }

  // .icon-wrapper {
  //   position: relative;
  //   width: var(--icon-size-l);
  // }

  // .icon {
  //   width: var(--icon-size-l);
  //   height: auto;

  //   &.fill {
  //     position: absolute;
  //     top: 0;
  //     left: 0;
  //     transform: scale(0);
  //     transform-origin: center;
  //     opacity: 0;
  //     transition:
  //       transform 0.3s ease,
  //       opacity 0.3s ease;
  //   }
  // }

  &:hover :deep(.fill) {
    transform: scale(1);
    opacity: 1;
  }

  // &:hover .icon .fill {
  //   transform: scale(1);
  //   opacity: 1;
  // }
}
</style>
