<script setup lang="ts">
import gsap from "gsap";
import CloseIcon from "../icons/CloseIcon.vue";

const emit = defineEmits<{
  close: [];
}>();

const containerEl = ref<HTMLElement | null>(null);
const closeEl = ref<HTMLElement | null>(null);
const titleEl = ref<HTMLElement | null>(null);
const textEl = ref<HTMLElement | null>(null);
const isClosing = ref(false);
const store = useExperienceStore();

onMounted(() => {
  if (!containerEl.value) return;

  const tl = gsap.timeline();

  tl.fromTo(
    containerEl.value,
    { scale: 0.5, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.5, ease: "power2.out" },
  )
    .fromTo(
      closeEl.value,
      { opacity: 0 },
      { opacity: 1, duration: 0.25, ease: "power2.out", delay: 0.25 },
      "<",
    )
    .fromTo(
      [titleEl.value, textEl.value],
      { opacity: 0, x: 6, y: 2 },
      {
        opacity: 1,
        x: 0,
        y: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.12,
      },
      "<",
    );
});

function handleClose() {
  if (isClosing.value) return;
  if (!containerEl.value) {
    emit("close");
    return;
  }

  isClosing.value = true;

  const tl = gsap.timeline({
    onComplete: () => {
      emit("close");
      isClosing.value = false;
    },
  });

  tl.to(containerEl.value, {
    scale: 0.5,
    opacity: 0,
    duration: 0.35,
    ease: "power2.out",
  }).to(
    [textEl.value, titleEl.value, closeEl.value],
    {
      opacity: 0,
      x: 6,
      y: 2,
      duration: 0.2,
      ease: "power2.out",
      stagger: 0.05,
    },
    "<",
  );
}
</script>

<template>
  <div ref="containerEl" class="popin" role="dialog" aria-modal="true">
    <div class="popin-content">
      <h3 ref="titleEl" class="popin-title">Credits</h3>
      <p ref="textEl" class="popin-text">
        Art direction, Design & Sound :<br />
        Anastasiya 'Ness' Viachorka<br />
        Louis Bocquet<br />
        Kevin Hascoët<br /><br />
        Development :<br />
        Gaspard Hedde<br />
        Matis Dené<br />
        Colin Demouge<br /><br />
        Special thanks to Paul, Florian and Adrien.
      </p>
    </div>

    <button
      ref="closeEl"
      type="button"
      class="close-button"
      aria-label="Close popin"
      @click="handleClose"
      @mouseenter="store.setCursorState('hover')"
      @mouseleave="store.setCursorState('base')"
    >
      <CloseIcon class="close" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.popin {
  position: fixed;
  bottom: global.rem(12);
  right: global.rem(12);
  overflow: visible;
  display: inline-grid;
  border-radius: var(--radius-xl);
  background-image: url("~/assets/img/popin-background.svg");
  background-repeat: no-repeat;
  background-position: center;
  background-size: cover;
  padding: global.rem(20);
  color: #0c1324;
  width: global.rem(256);
  gap: global.rem(20);
  transform-origin: bottom right;
}

.close-button {
  pointer-events: auto;
  width: var(--icon-size-l);
  height: var(--icon-size-l);
  justify-self: flex-end;
}

.close {
  width: var(--icon-size-l);
  height: var(--icon-size-l);
}

.popin-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  color: #0c1324;
  gap: var(--gap-s);
}

.popin-title,
.popin-text {
  opacity: 0;
}

button[aria-label="Close popin"] {
  opacity: 0;
}

.popin-title {
  margin: 0;
  @include style.apply(uppercase);
  text-transform: uppercase;
}

.popin-text {
  margin: 0;
  @include style.apply(base);
}
</style>
