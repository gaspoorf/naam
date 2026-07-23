<script setup lang="ts">
import InteractionIcon from "./InteractionIcon.vue";

const ui = useExperienceStore();
const { infoInteractionIcon, infoText, isTransitioning } = storeToRefs(ui);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="!isTransitioning && infoText && infoInteractionIcon"
      class="info-interaction"
    >
      <div class="info-content">
        <InteractionIcon :type="infoInteractionIcon" class="info-icon" />
        <p class="info-text">{{ infoText }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.info-interaction {
  height: 100dvh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-xs);
}

.info-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--gap-sm);
  bottom: global.rem(64);
  left: 50%;
  transform: translateX(-50%);
  max-width: global.rem(340);
}

.info-icon {
  width: var(--icon-size-xl);
  height: var(--icon-size-xl);
}

.info-text {
  color: var(--color-off-white);
  @include style.apply(body-s);
  text-align: center;
  text-wrap: balance;
}
</style>
