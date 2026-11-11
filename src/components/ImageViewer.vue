<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between backdrop-blur-sm select-none"
      @click.self="close"
    >
      <!-- 顶部工具栏 -->
      <div class="flex items-center justify-between px-4 py-3 text-white pt-safe-top">
        <span class="text-sm font-medium text-slate-300">
          {{ currentIndex + 1 }} / {{ images.length }}
        </span>
        <div class="flex items-center gap-3">
          <button
            @click="downloadCurrentImage"
            class="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            title="下载原图"
          >
            <Download class="w-5 h-5" />
          </button>
          <button
            @click="close"
            class="p-2 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
            title="关闭"
          >
            <X class="w-6 h-6" />
          </button>
        </div>
      </div>

      <!-- 图片主展示区 (支持滑动切换与双击缩放) -->
      <div
        class="flex-1 flex items-center justify-center relative overflow-hidden px-2"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <img
          v-if="currentImage"
          :src="currentImage.data || currentImage.thumbnail"
          :alt="currentImage.name || '照片'"
          class="max-w-full max-h-full object-contain transition-transform duration-200"
          :style="{ transform: `scale(${zoomLevel})` }"
          @dblclick="toggleZoom"
        />

        <!-- 左右切换按键（适用于平板/电脑端或点击） -->
        <button
          v-if="currentIndex > 0"
          @click.stop="prevImage"
          class="absolute left-3 p-2.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 active:scale-95 transition-all"
        >
          <ChevronLeft class="w-6 h-6" />
        </button>
        <button
          v-if="currentIndex < images.length - 1"
          @click.stop="nextImage"
          class="absolute right-3 p-2.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 active:scale-95 transition-all"
        >
          <ChevronRight class="w-6 h-6" />
        </button>
      </div>

      <!-- 底部图片信息与缩略图轮播 -->
      <div class="px-4 py-3 pb-safe-bottom bg-black/40">
        <div class="text-xs text-center text-slate-400 mb-2 truncate">
          {{ currentImage?.name }}
          <span v-if="currentImage?.size">({{ formatSize(currentImage.size) }})</span>
        </div>
        <!-- 底部缩略图条 -->
        <div v-if="images.length > 1" class="flex justify-center gap-2 overflow-x-auto py-1 no-scrollbar">
          <div
            v-for="(img, idx) in images"
            :key="idx"
            @click="currentIndex = idx"
            class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border-2 transition-all"
            :class="idx === currentIndex ? 'border-primary-500 scale-105' : 'border-transparent opacity-50'"
          >
            <img :src="img.thumbnail || img.data" class="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps({
  visible: { type: Boolean, default: false },
  images: { type: Array, default: () => [] },
  startIndex: { type: Number, default: 0 },
});

const emit = defineEmits(['update:visible', 'close']);

const currentIndex = ref(0);
const zoomLevel = ref(1);

watch(
  () => props.startIndex,
  (val) => {
    currentIndex.value = val || 0;
  }
);

watch(
  () => props.visible,
  (val) => {
    if (val) {
      zoomLevel.value = 1;
      currentIndex.value = props.startIndex || 0;
    }
  }
);

const currentImage = computed(() => {
  if (!props.images || props.images.length === 0) return null;
  return props.images[currentIndex.value] || props.images[0];
});

function close() {
  emit('update:visible', false);
  emit('close');
}

function prevImage() {
  if (currentIndex.value > 0) {
    currentIndex.value--;
    zoomLevel.value = 1;
  }
}

function nextImage() {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
    zoomLevel.value = 1;
  }
}

function toggleZoom() {
  zoomLevel.value = zoomLevel.value === 1 ? 2 : 1;
}

function downloadCurrentImage() {
  if (!currentImage.value) return;
  const link = document.createElement('a');
  link.href = currentImage.value.data || currentImage.value.thumbnail;
  link.download = currentImage.value.name || 'note_photo.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 手机端触摸滑动切图
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }
}

function handleTouchEnd(e) {
  if (e.changedTouches.length === 1) {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    // 水平滑动距离大于 50px 且垂直位移小于 80px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 80) {
      if (deltaX > 0) {
        prevImage();
      } else {
        nextImage();
      }
    }
  }
}
</script>
