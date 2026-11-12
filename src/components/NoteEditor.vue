<template>
  <Transition
    enter-active-class="transition duration-250 ease-out"
    enter-from-class="opacity-0 translate-y-full"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-full"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col overflow-hidden"
    >
      <!-- 全屏编辑器容器 (100% 全屏沉浸体验) -->
      <div
        class="w-full max-w-3xl mx-auto flex-1 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden"
      >
        <!-- 顶部操作栏 -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pt-safe-top bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 flex-shrink-0">
          <button
            @click="cancel"
            class="text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          >
            取消
          </button>

          <span class="text-base font-bold text-slate-800 dark:text-slate-100">
            {{ isEditing ? '编辑笔记' : '新建笔记' }}
          </span>

          <button
            @click="save"
            :disabled="isSaving || isCompressing"
            class="text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 active:scale-95 disabled:opacity-50 px-4 py-1.5 rounded-full shadow-xs transition-all flex items-center gap-1.5"
          >
            <Check class="w-4 h-4" />
            <span>完成</span>
          </button>
        </div>

        <!-- 内容全屏滚动区 -->
        <div class="flex-1 overflow-y-auto px-5 py-5 space-y-5 smooth-scroll">
          <!-- 标题输入 (大字号) -->
          <input
            v-model="form.title"
            type="text"
            placeholder="输入标题 (可选)"
            class="w-full text-xl sm:text-2xl font-bold bg-transparent border-b border-slate-100 dark:border-slate-800/80 pb-3 focus:border-primary-500 outline-none text-slate-900 dark:text-slate-50 placeholder-slate-400"
          />

          <!-- 快捷 Markdown / 格式插入栏 -->
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              @click="insertText('- [ ] ')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <CheckSquare class="w-3.5 h-3.5 text-primary-600" />
              <span>待办清单</span>
            </button>
            <button
              @click="insertText('- ')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <List class="w-3.5 h-3.5 text-indigo-500" />
              <span>列表项</span>
            </button>
            <button
              @click="insertText('**加粗**')"
              class="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Bold class="w-3.5 h-3.5 text-slate-600" />
              <span>粗体</span>
            </button>
            <button
              @click="insertTime"
              class="px-3 py-1.5 text-xs font-medium rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Clock class="w-3.5 h-3.5 text-amber-500" />
              <span>时间戳</span>
            </button>
          </div>

          <!-- 正文全屏大输入区 (大幅扩展高度，打字不再局限在小格子) -->
          <textarea
            ref="contentInputRef"
            v-model="form.content"
            placeholder="记下此时的想法、生活日常、灵感或工作备忘... (支持长文与照片)"
            rows="10"
            @paste="handlePaste"
            class="w-full min-h-[260px] text-base bg-transparent border-0 outline-none resize-none text-slate-800 dark:text-slate-100 placeholder-slate-400 leading-relaxed font-normal"
          ></textarea>

          <!-- 照片展示与上传区 -->
          <div class="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon class="w-4 h-4 text-primary-600" />
                照片附件 ({{ form.images.length }})
              </span>
              <span v-if="isCompressing" class="text-xs text-primary-600 animate-pulse font-medium">
                {{ compressStatusText }}
              </span>
            </div>

            <!-- 照片网格 -->
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              <!-- 已选照片预览卡片 -->
              <div
                v-for="(img, idx) in form.images"
                :key="img.id || idx"
                class="group relative aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                <img
                  :src="img.thumbnail || img.data"
                  class="w-full h-full object-cover cursor-pointer"
                  @click="previewImage(idx)"
                />
                <!-- 删除图片按键 -->
                <button
                  @click.stop="removeImage(idx)"
                  class="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors shadow-xs"
                >
                  <X class="w-3.5 h-3.5" />
                </button>
              </div>

              <!-- 拍照按钮 (直接唤起手机相机) -->
              <label
                class="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 active:scale-95 cursor-pointer transition-all"
              >
                <Camera class="w-6 h-6 mb-1 text-primary-600 dark:text-primary-400" />
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
                class="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 active:scale-95 cursor-pointer transition-all"
              >
                <Images class="w-6 h-6 mb-1 text-indigo-500" />
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

          <!-- 分类标签 -->
          <div class="pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Tag class="w-3.5 h-3.5 text-slate-400" />
              分类标签
            </div>

            <!-- 既有标签选择 -->
            <div v-if="allTags.length > 0" class="flex flex-wrap gap-2 mb-2.5">
              <button
                v-for="tag in allTags"
                :key="tag"
                type="button"
                @click="toggleTag(tag)"
                class="px-3 py-1 text-xs rounded-full border transition-all"
                :class="form.tags.includes(tag) ? 'bg-primary-600 text-white border-primary-600 shadow-2xs' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'"
              >
                #{{ tag }}
              </button>
            </div>

            <!-- 自定义新标签输入 -->
            <div class="flex items-center gap-2">
              <input
                v-model="newTagInput"
                type="text"
                placeholder="添加新标签 (如 生活/工作/旅行)"
                @keydown.enter.prevent="addNewTag"
                class="flex-1 text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                @click="addNewTag"
                class="px-4 py-2.5 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-200 transition-colors"
              >
                添加
              </button>
            </div>
          </div>

          <!-- 置顶开关 -->
          <div class="flex items-center justify-between py-3 border-t border-slate-100 dark:border-slate-800/80">
            <span class="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Pin class="w-4 h-4 text-primary-600" />
              置顶这条笔记
            </span>
            <input
              type="checkbox"
              v-model="form.isPinned"
              class="w-5 h-5 accent-primary-600 rounded cursor-pointer"
            />
          </div>

          <!-- 底部安全间隙，留足虚拟键盘滚动空间 -->
          <div class="h-24 pb-safe-bottom"></div>
        </div>
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
  // 必须深拷贝脱敏纯数据，防止 Vue 3 的 Proxy 传递导致浏览器 IndexedDB 报错 DataCloneError
  const noteData = {
    id: form.id || 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: finalTitle,
    content: form.content.trim(),
    images: JSON.parse(JSON.stringify(form.images || [])),
    tags: JSON.parse(JSON.stringify(form.tags || [])),
    isPinned: !!form.isPinned,
    createdAt: form.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  emit('save', noteData);
  isSaving.value = false;
  emit('update:visible', false);
}
</script>
