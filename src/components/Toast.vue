<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 -translate-y-4 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 -translate-y-2 scale-95"
  >
    <div
      v-if="toastState.visible"
      class="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium backdrop-blur-md border max-w-[90vw]"
      :class="typeClasses"
    >
      <component :is="iconComponent" class="w-4 h-4 flex-shrink-0" />
      <span class="truncate">{{ toastState.message }}</span>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';
import { useToast } from '../composables/useToast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next';

const { toastState } = useToast();

const iconComponent = computed(() => {
  switch (toastState.value.type) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return AlertCircle;
    case 'warning':
      return AlertTriangle;
    default:
      return Info;
  }
});

const typeClasses = computed(() => {
  switch (toastState.value.type) {
    case 'success':
      return 'bg-emerald-600/95 text-white border-emerald-500 shadow-emerald-900/20';
    case 'error':
      return 'bg-rose-600/95 text-white border-rose-500 shadow-rose-900/20';
    case 'warning':
      return 'bg-amber-500/95 text-white border-amber-400 shadow-amber-900/20';
    default:
      return 'bg-slate-800/95 text-white border-slate-700 shadow-slate-900/20';
  }
});
</script>
