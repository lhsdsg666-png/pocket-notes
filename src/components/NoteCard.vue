<template>
  <div
    class="group relative bg-white dark:bg-slate-850 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
    :class="{ 'border-primary-300 dark:border-primary-700 bg-primary-50/20 dark:bg-primary-950/10': note.isPinned }"
    @click="$emit('click-note', note)"
  >
    <!-- 卡片顶部：置顶标志与操作按键 -->
    <div>
      <div class="flex items-start justify-between gap-2 mb-2">
        <!-- 标题 -->
        <h3
          v-if="note.title"
          class="font-semibold text-base text-slate-850 dark:text-slate-100 line-clamp-2 leading-snug"
        >
          {{ note.title }}
        </h3>
        <span v-else class="text-xs text-slate-400 italic">无标题</span>

        <!-- 置顶小图标 -->
        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click.stop="$emit('toggle-pin', note)"
            class="p-1 rounded-md text-slate-400 hover:text-primary-600 active:scale-90 transition-colors"
            :class="{ 'text-primary-600 dark:text-primary-400': note.isPinned }"
            :title="note.isPinned ? '取消置顶' : '置顶笔记'"
          >
            <Pin class="w-4 h-4" :class="{ 'fill-primary-600': note.isPinned }" />
          </button>
        </div>
      </div>

      <!-- 图片网格展示区 (点击图片看大图，阻止卡片打开) -->
      <div v-if="note.images && note.images.length > 0" class="mb-3 rounded-xl overflow-hidden">
        <!-- 单张图片展示 -->
        <div
          v-if="note.images.length === 1"
          class="w-full max-h-64 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
          @click.stop="$emit('view-image', { images: note.images, index: 0 })"
        >
          <img
            :src="note.images[0].thumbnail || note.images[0].data"
            :alt="note.images[0].name"
            class="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
            loading="lazy"
          />
        </div>

        <!-- 2张图片展示：双列对齐 -->
        <div
          v-else-if="note.images.length === 2"
          class="grid grid-cols-2 gap-1.5 rounded-xl overflow-hidden"
        >
          <div
            v-for="(img, idx) in note.images"
            :key="img.id || idx"
            class="aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden rounded-lg"
            @click.stop="$emit('view-image', { images: note.images, index: idx })"
          >
            <img
              :src="img.thumbnail || img.data"
              class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>
        </div>

        <!-- 3张及以上：九宫格/缩略图展示，第3张显示 +N -->
        <div
          v-else
          class="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden"
        >
          <div
            v-for="(img, idx) in note.images.slice(0, 3)"
            :key="img.id || idx"
            class="aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer relative overflow-hidden rounded-lg"
            @click.stop="$emit('view-image', { images: note.images, index: idx })"
          >
            <img
              :src="img.thumbnail || img.data"
              class="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
            <!-- 超过3张蒙层提示 -->
            <div
              v-if="idx === 2 && note.images.length > 3"
              class="absolute inset-0 bg-black/50 text-white font-bold text-sm flex items-center justify-center backdrop-blur-2xs"
            >
              +{{ note.images.length - 2 }}
            </div>
          </div>
        </div>
      </div>

      <!-- 文字内容预览 -->
      <div
        v-if="note.content"
        class="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-4 leading-relaxed font-normal mb-3"
      >
        {{ note.content }}
      </div>

      <!-- 标签展示 -->
      <div
        v-if="note.tags && note.tags.length > 0"
        class="flex flex-wrap gap-1.5 mb-3"
      >
        <span
          v-for="tag in note.tags"
          :key="tag"
          @click.stop="$emit('filter-tag', tag)"
          class="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950 transition-colors"
        >
          #{{ tag }}
        </span>
      </div>
    </div>

    <!-- 卡片底部：时间与快捷菜单 -->
    <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
      <span>{{ formatDate(note.updatedAt || note.createdAt) }}</span>

      <div class="flex items-center gap-1">
        <button
          @click.stop="$emit('edit-note', note)"
          class="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="编辑"
        >
          <Edit3 class="w-3.5 h-3.5" />
        </button>
        <button
          @click.stop="$emit('delete-note', note)"
          class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          title="删除"
        >
          <Trash2 class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Pin, Edit3, Trash2 } from 'lucide-vue-next';

defineProps({
  note: { type: Object, required: true },
});

defineEmits([
  'click-note',
  'toggle-pin',
  'view-image',
  'filter-tag',
  'edit-note',
  'delete-note',
]);

function formatDate(isoStr) {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;

  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${m}月${d}日 ${h}:${min}`;
}
</script>
