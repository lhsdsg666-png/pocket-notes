<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-6"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-6"
  >
    <div
      v-if="visible && note"
      class="fixed inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100 select-text"
    >
      <!-- 顶部固定导航栏 -->
      <div class="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md pt-safe-top z-10 flex-shrink-0">
        <!-- 返回按钮 -->
        <button
          @click="close"
          class="flex items-center gap-1.5 py-1 px-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all -ml-1.5"
        >
          <ChevronLeft class="w-5 h-5 text-slate-500" />
          <span>返回</span>
        </button>

        <!-- 右侧操作栏：置顶、编辑、更多(删除/复制) -->
        <div class="flex items-center gap-1.5">
          <!-- 置顶按键 -->
          <button
            @click="$emit('toggle-pin', note)"
            class="p-2 rounded-xl text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            :class="{ 'text-primary-600 dark:text-primary-400': note.isPinned }"
            :title="note.isPinned ? '取消置顶' : '置顶笔记'"
          >
            <Pin class="w-4 h-4" :class="{ 'fill-primary-600': note.isPinned }" />
          </button>

          <!-- 复制正文 -->
          <button
            @click="copyContent"
            class="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
            title="复制笔记文字"
          >
            <Copy class="w-4 h-4" />
          </button>

          <!-- 删除笔记 -->
          <button
            @click="handleDelete"
            class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:scale-95 transition-all"
            title="删除笔记"
          >
            <Trash2 class="w-4 h-4" />
          </button>

          <!-- 全屏编辑按钮 (核心功能) -->
          <button
            @click="$emit('edit', note)"
            class="ml-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-xs active:scale-95 transition-all flex items-center gap-1"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>编辑</span>
          </button>
        </div>
      </div>

      <!-- 笔记正文全屏滚动区域 (手机原生沉浸式阅读) -->
      <div class="flex-1 overflow-y-auto px-5 py-6 max-w-3xl w-full mx-auto smooth-scroll space-y-5">
        <!-- 标题 -->
        <h1 class="text-2xl font-bold text-slate-900 dark:text-slate-50 leading-snug tracking-tight">
          {{ note.title || '无标题笔记' }}
        </h1>

        <!-- 时间与标签元数据 -->
        <div class="flex flex-wrap items-center gap-2 pb-2 text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
          <span class="flex items-center gap-1">
            <Clock class="w-3.5 h-3.5" />
            {{ formatFullTime(note.updatedAt || note.createdAt) }}
          </span>

          <span v-if="note.updatedAt && note.createdAt && note.updatedAt !== note.createdAt" class="text-slate-300 dark:text-slate-600">
            · 已编辑
          </span>

          <!-- 标签徽章 -->
          <div v-if="note.tags && note.tags.length > 0" class="flex flex-wrap gap-1.5 ml-auto">
            <span
              v-for="tag in note.tags"
              :key="tag"
              class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium text-[11px]"
            >
              #{{ tag }}
            </span>
          </div>
        </div>

        <!-- 照片画廊展示区 (大图舒适呈现，点击可全屏放大/缩放) -->
        <div v-if="note.images && note.images.length > 0" class="space-y-2.5">
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ImageIcon class="w-3.5 h-3.5" />
            照片附件 ({{ note.images.length }})
          </div>

          <!-- 单张图片：全宽高清大图呈现 -->
          <div
            v-if="note.images.length === 1"
            class="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer shadow-sm border border-slate-200/60 dark:border-slate-800"
            @click="$emit('preview-image', { images: note.images, index: 0 })"
          >
            <img
              :src="note.images[0].data || note.images[0].thumbnail"
              :alt="note.images[0].name"
              class="w-full max-h-[60vh] object-contain hover:scale-101 transition-transform"
            />
          </div>

          <!-- 多张图片：整齐的两列/三列网格 -->
          <div
            v-else
            class="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl overflow-hidden"
          >
            <div
              v-for="(img, idx) in note.images"
              :key="img.id || idx"
              class="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200/60 dark:border-slate-800 relative group"
              @click="$emit('preview-image', { images: note.images, index: idx })"
            >
              <img
                :src="img.thumbnail || img.data"
                :alt="img.name"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <!-- 正文内容 (完整展开，大字号舒适排版，支持待办清单) -->
        <div class="pt-2 text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal whitespace-pre-wrap select-text break-words">
          <template v-for="(line, idx) in parseContentLines(note.content)" :key="idx">
            <!-- 待办清单行 -->
            <div v-if="line.isTodo" class="flex items-start gap-2.5 py-1">
              <input
                type="checkbox"
                :checked="line.checked"
                @change="toggleTodo(idx, $event)"
                class="mt-1 w-4 h-4 rounded text-primary-600 accent-primary-600 cursor-pointer flex-shrink-0"
              />
              <span :class="{ 'line-through text-slate-400 dark:text-slate-500': line.checked }">
                {{ line.text }}
              </span>
            </div>
            <!-- 普通文本行 -->
            <div v-else class="min-h-[1.5em]">
              {{ line.text }}
            </div>
          </template>
        </div>

        <!-- 底部大间距与安全区 -->
        <div class="h-20 pb-safe-bottom"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import {
  ChevronLeft,
  Edit3,
  Pin,
  Trash2,
  Copy,
  Clock,
  ImageIcon,
} from 'lucide-vue-next';
import { useToast } from '../composables/useToast';

const props = defineProps({
  visible: { type: Boolean, default: false },
  note: { type: Object, default: null },
});

const emit = defineEmits([
  'update:visible',
  'close',
  'edit',
  'toggle-pin',
  'delete',
  'preview-image',
  'update-note',
]);

const { showToast } = useToast();

function close() {
  emit('update:visible', false);
  emit('close');
}

function handleDelete() {
  if (props.note) {
    emit('delete', props.note);
    close();
  }
}

function copyContent() {
  if (!props.note) return;
  const text = `${props.note.title ? props.note.title + '\n\n' : ''}${props.note.content || ''}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast('已复制笔记文字到剪贴板', 'success');
  }).catch(() => {
    showToast('复制失败', 'error');
  });
}

function formatFullTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}:${min}`;
}

// 解析文本中的待办清单 `- [ ] ` 或 `- [x] `
function parseContentLines(content) {
  if (!content) return [];
  const lines = content.split('\n');
  return lines.map((line) => {
    const todoMatch = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
    if (todoMatch) {
      return {
        isTodo: true,
        checked: todoMatch[1].toLowerCase() === 'x',
        text: todoMatch[2],
        raw: line,
      };
    }
    return {
      isTodo: false,
      text: line,
      raw: line,
    };
  });
}

// 快速切换阅读状态下的待办勾选
function toggleTodo(lineIndex, event) {
  if (!props.note || !props.note.content) return;
  const lines = props.note.content.split('\n');
  const targetLine = lines[lineIndex];
  if (!targetLine) return;

  const isChecked = event.target.checked;
  const newPrefix = isChecked ? '- [x] ' : '- [ ] ';
  lines[lineIndex] = targetLine.replace(/^-\s*\[([ xX])\]\s*/, newPrefix);

  const updatedNote = {
    ...props.note,
    content: lines.join('\n'),
    updatedAt: new Date().toISOString(),
  };

  emit('update-note', updatedNote);
}
</script>
