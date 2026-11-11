import { ref } from 'vue';

const toastState = ref({
  visible: false,
  message: '',
  type: 'info', // 'success' | 'error' | 'warning' | 'info'
  duration: 3000,
  timer: null,
});

export function useToast() {
  function showToast(message, type = 'info', duration = 2500) {
    if (toastState.value.timer) {
      clearTimeout(toastState.value.timer);
    }
    toastState.value.message = message;
    toastState.value.type = type;
    toastState.value.duration = duration;
    toastState.value.visible = true;

    toastState.value.timer = setTimeout(() => {
      toastState.value.visible = false;
    }, duration);
  }

  function hideToast() {
    toastState.value.visible = false;
    if (toastState.value.timer) {
      clearTimeout(toastState.value.timer);
    }
  }

  return {
    toastState,
    showToast,
    hideToast,
  };
}
