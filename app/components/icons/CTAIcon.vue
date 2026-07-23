<script setup lang="ts">
import ChevronLeftFillIcon from "./ChevronLeftFillIcon.vue";
import ChevronRightFillIcon from "./ChevronRightFillIcon.vue";
import ChevronRightIcon from "./ChevronRightIcon.vue";
import ChevrontLeftIcon from "./ChevrontLeftIcon.vue";
import RestartFillIcon from "./RestartFillIcon.vue";
import RestartIcon from "./RestartIcon.vue";

const props = withDefaults(
  defineProps<{
    icon?: "chevron-right" | "restart" | "chevron-left";
  }>(),
  {
    icon: "chevron-right",
  },
);
</script>

<template>
  <div class="icon-wrapper">
    <RestartIcon v-if="props.icon === 'restart'" class="icon" />
    <RestartFillIcon v-if="props.icon === 'restart'" class="icon fill" />

    <ChevronRightIcon v-if="props.icon === 'chevron-right'" class="icon" />
    <ChevronRightFillIcon
      v-if="props.icon === 'chevron-right'"
      class="icon fill"
    />

    <ChevrontLeftIcon v-if="props.icon === 'chevron-left'" class="icon" />
    <ChevronLeftFillIcon
      v-if="props.icon === 'chevron-left'"
      class="icon fill"
    />
  </div>
</template>

<style scoped lang="scss">
.icon-wrapper {
  position: relative;
  width: var(--icon-size-l);
  color: var(--color-off-white);

  &.reverse {
    transform: rotate(180deg);
  }
}

.icon {
  width: var(--icon-size-l);
  height: auto;

  &.fill {
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
}
</style>
