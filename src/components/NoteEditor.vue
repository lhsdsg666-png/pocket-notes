<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:justify-center md:items-center"
      @click.self="handleBackdropClick"
    >
      <!-- 编辑器卡片容器 -->
      <div
        class="w-full md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl max-h-[92dvh] md:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800"
      >
        <!-- 顶部操作栏 -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pt-safe-top">
          <button
            @click="cancel"
            class="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded-lg"
          >
            取消
          </button>

          <span class="text-base font-semibold text-slate-800 dark:text-slate-100">
            {{ isEditing ? '编辑笔记' : '新建笔记' }}
          </span>

          <button
            @click="save"
            :disabled="isSaving || isCompressing"
            class="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-50 px-4 py-1.5 rounded-full shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check class="w-4 h-4" />
            <span>保存</span>
          </button>
        </div>

        <!-- 内容滚动区 -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4 smooth-scroll">
          <!-- 标题输入 -->
          <input
            v-model="form.title"
            type="text"
            placeholder="标题 (可选，默认提取正文首行)"
            class="w-full text-lg font-bold bg-transparent border-b border-slate-100 dark:border-slate-800 pb-2 focus:border-primary-500 outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400"
          />

          <!-- 快捷 Markdown / 格式插入栏 -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            <button
              @click="insertText('- [ ] ')"
              class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
            >
              <CheckSquare class="w-3.5 h-3.5" />
              <span>待办</span>
            </button>
            <button
              @click="insertText('- ')"
              class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
            >
              <List class="w-3.5 h-3.5" />
              <span>列表</span>
            </button>
            <button
              @click="insertText('**加粗**')"
              class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
            >
              <Bold class="w-3.5 h-3.5" />
              <span>粗体</span>
            </button>
            <button
              @click="insertTime"
              class="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
            >
              <Clock class="w-3.5 h-3.5" />
              <span>时间戳</span>
            </button>
          </div>

          <!-- 正文输入框 -->
          <textarea
            ref="contentInputRef"
            v-model="form.content"
            placeholder="记下此时的想法、备忘、日记或灵感... (支持粘贴图片)"
            rows="6"
            @paste="handlePaste"
            class="w-full text-base bg-transparent border-0 outline-none resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 leading-relaxed"
          ></textarea>

          <!-- 图片展示与上传区 -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon class="w-3.5 h-3.5" />
                照片 ({{ form.images.length }})
              </span>
              <span v-if="isCompressing" class="text-xs text-primary-600 animate-pulse">
                {{ compressStatusText }}
              </span>
            </div>

            <!-- 照片九宫格 -->
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
              <!-- 已有图片缩略图 -->
              <div
                v-for="(img, idx) in form.images"
                :key="img.id || idx"
                class="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <img
                  :src="img.thumbnail || img.data"
                  class="w-full h-full object-cover cursor-pointer"
                  @click="previewImage(idx)"
                />
                <!-- 删除图片按键 -->
                <button
                  @click.stop="removeImage(idx)"
                  class="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- 拍照按钮 (直接调用手机相机) -->
              <label
                class="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 active:scale-95 cursor-pointer transition-all"
              >
                <Camera class="w-5 h-5 mb-1 text-primary-600 dark:text-primary-400" />
                <span class="text-xs font-medium">拍照</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </label>

              <!-- 相册选择按钮 (支持多选) -->
              <label
                class="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 active:scale-95 cursor-pointer transition-all"
              >
                <Images class="w-5 h-5 mb-1 text-indigo-500" />
                <span class="text-xs font-medium">相册多选</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  class="hidden"
                  @change="handleFileSelect"
                />
              </label>
            </div>
          </div>

          <!-- 标签选择与添加 -->
          <div>
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Tag class="w-3.5 h-3.5" />
              分类标签
            </div>

            <!-- 既有标签快速切换 -->
            <div v-if="allTags.length > 0" class="flex flex-wrap gap-1.5 mb-2">
              <button
                v-for="tag in allTags"
                :key="tag"
                type="button"
                @click="toggleTag(tag)"
                class="px-2.5 py-1 text-xs rounded-full border transition-all"
                :class="form.tags.includes(tag) ? 'bg-primary-600 text-white border-primary-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
              >
                #{{ tag }}
              </button>
            </div>

            <!-- 自定义新标签输入 -->
            <div class="flex items-center gap-2">
              <input
                v-model="newTagInput"
                type="text"
                placeholder="添加新标签 (如 灵感/工作/生活)"
                @keydown.enter.prevent="addNewTag"
                class="flex-1 text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                @click="addNewTag"
                class="px-3 py-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          <!-- 置顶开关 -->
          <div class="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
            <span class="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Pin class="w-4 h-4 text-primary-600" />
              置顶这条笔记
            </span>
            <input
              type="checkbox"
              v-model="form.isPinned"
              class="w-5 h-5 accent-primary-600 rounded cursor-pointer"
            />
          </div>
        </div>

        <!-- 底部安全间隙 -->
        <div class="pb-safe-bottom bg-white dark:bg-slate-900"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue';
import {
  Check,
  X,
  Camera,
  Images,
  ImageIcon,
  Tag,
  Pin,
  CheckSquare,
  List,
  Bold,
  Clock,
} from 'lucide-vue-next';
import { compressImages } from '../services/imageCompressor';
import { useToast } from '../composables/useToast';

const props = defineProps({
  visible: { type: Boolean, default: false },
  note: { type: Object, default: null },
  allTags: { type: Array, default: () => [] },
});

const emit = defineEmits(['update:visible', 'save', 'preview-image']);

const { showToast } = useToast();

const isEditing = ref(false);
const isSaving = ref(false);
const isCompressing = ref(false);
const compressStatusText = ref('');
const newTagInput = ref('');
const contentInputRef = ref(null);

const form = reactive({
  id: null,
  title: '',
  content: '',
  images: [],
  tags: [],
  isPinned: false,
  createdAt: null,
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.note) {
        isEditing.value = true;
        form.id = props.note.id;
        form.title = props.note.title || '';
        form.content = props.note.content || '';
        form.images = props.note.images ? [...props.note.images] : [];
        form.tags = props.note.tags ? [...props.note.tags] : [];
        form.isPinned = !!props.note.isPinned;
        form.createdAt = props.note.createdAt;
      } else {
        isEditing.value = false;
        form.id = null;
        form.title = '';
        form.content = '';
        form.images = [];
        form.tags = [];
        form.isPinned = false;
        form.createdAt = null;
      }
      newTagInput.value = '';
    }
  }
);

function cancel() {
  emit('update:visible', false);
}

function handleBackdropClick() {
  // 如果内容非空，则提示或直接保留，这里直接关闭
  cancel();
}

function insertText(text) {
  if (!contentInputRef.value) return;
  const textarea = contentInputRef.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = form.content.substring(0, start);
  const after = form.content.substring(end);
  form.content = before + text + after;
  nextTick(() => {
    textarea.focus();
    textarea.setSelectionRange(start + text.length, start + text.length);
  });
}

function insertTime() {
  const now = new Date();
  const timeStr = `[${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}] `;
  insertText(timeStr);
}

// 快速切换已有标签
function toggleTag(tag) {
  const index = form.tags.indexOf(tag);
  if (index > -1) {
    form.tags.splice(index, 1);
  } else {
    form.tags.push(tag);
  }
}

// 添加新标签
function addNewTag() {
  const clean = newTagInput.value.trim().replace(/^#/, '');
  if (!clean) return;
  if (!form.tags.includes(clean)) {
    form.tags.push(clean);
  }
  newTagInput.value = '';
}

// 处理从手机相册或相机选择的照片
async function handleFileSelect(e) {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  isCompressing.value = true;
  compressStatusText.value = `处理中 (共 ${files.length} 张)...`;

  try {
    const compressedList = await compressImages(files, (curr, total) => {
      compressStatusText.value = `压缩中 ${curr}/${total}...`;
    });

    form.images.push(...compressedList);
    showToast(`已添加 ${compressedList.length} 张高清压缩照片`, 'success');
  } catch (err) {
    showToast(`处理照片失败: ${err.message}`, 'error');
  } finally {
    isCompressing.value = false;
    compressStatusText.value = '';
    e.target.value = '';
  }
}

// 支持粘贴剪贴板中的图片
async function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;

  const imageFiles = [];
  for (const item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      if (file) imageFiles.push(file);
    }
  }

  if (imageFiles.length > 0) {
    isCompressing.value = true;
    compressStatusText.value = '正在处理粘贴的图片...';
    try {
      const compressedList = await compressImages(imageFiles);
      form.images.push(...compressedList);
      showToast(`已成功粘贴 ${compressedList.length} 张图片`, 'success');
    } catch (err) {
      showToast(`粘贴图片失败: ${err.message}`, 'error');
    } finally {
      isCompressing.value = false;
      compressStatusText.value = '';
    }
  }
}

function removeImage(index) {
  form.images.splice(index, 1);
}

function previewImage(index) {
  emit('preview-image', { images: form.images, index });
}

async function save() {
  if (!form.content.trim() && form.images.length === 0 && !form.title.trim()) {
    showToast('请输入文字或添加照片', 'warning');
    return;
  }

  // 若标题为空，自动提取正文前20个字作为标题
  let finalTitle = form.title.trim();
  if (!finalTitle && form.content.trim()) {
    const firstLine = form.content.trim().split('\n')[0];
    finalTitle = firstLine.substring(0, 25);
  }

  isSaving.value = true;
  const noteData = {
    id: form.id || 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: finalTitle,
    content: form.content.trim(),
    images: form.images,
    tags: form.tags,
    isPinned: form.isPinned,
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  emit('save', noteData);
  isSaving.value = false;
  emit('update:visible', false);
}
</script>
