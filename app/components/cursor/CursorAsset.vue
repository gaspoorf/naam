<script setup lang="ts">
import type { CursorState } from "~/types/cursor";
import BaseCursor from "./BaseCursor.vue";
import HoldCursor from "./HoldCursor.vue";
import HoverCursor from "./HoverCursor.vue";

const props = defineProps<{
  state: CursorState;
}>();
</script>

<template>
  <BaseCursor class="cursor-icon" v-if="state === 'base'" />
  <HoverCursor class="cursor-icon" v-else-if="state === 'hover'" />
  <HoldCursor class="cursor-icon" v-else-if="state === 'hold'" />
</template>

<style scoped lang="scss">
.cursor-icon {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
