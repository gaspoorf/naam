<script setup lang="ts">
import type { InteractionIconType } from "~/types/ui";
import InteractionClickIcon from "../icons/InteractionClickIcon.vue";
import InteractionHoldIcon from "../icons/InteractionHoldIcon.vue";
import InteractionMoveIcon from "../icons/InteractionMoveIcon.vue";

const props = defineProps<{
  type: InteractionIconType;
}>();
</script>

<template>
  <InteractionClickIcon v-if="type === 'click'" />
  <InteractionMoveIcon v-else-if="type === 'move'" />
  <InteractionHoldIcon v-else-if="type === 'hold'" />
</template>
