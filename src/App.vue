<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col transition-colors selection:bg-primary-500 selection:text-white">
    <!-- 顶部导航栏 -->
    <Header
      :notes-count="filteredNotes.length"
      :all-tags="allTags"
      :selected-tag="selectedTag"
      :search-query="searchQuery"
      :layout-mode="layoutMode"
      :has-sync-config="hasSyncConfig"
      :is-syncing="isSyncing"
      @toggle-layout="toggleLayout"
      @sync-clicked="handleQuickSync"
      @open-settings="openSettings"
      @select-tag="selectedTag = $event"
      @update:search-query="searchQuery = $event"
    />

    <!-- 笔记主体展示区 -->
    <main class="flex-1 max-w-4xl w-full mx-auto px-4 py-4 pb-24">
      <!-- 空状态展示 -->
      <div
        v-if="filteredNotes.length === 0"
        class="min-h-[50vh] flex flex-col items-center justify-center text-center px-4"
      >
        <div class="w-20 h-20 rounded-3xl bg-primary-50 dark:bg-primary-950/40 text-primary-500 flex items-center justify-center mb-4 shadow-inner">
          <BookOpen class="w-10 h-10 stroke-[1.5]" />
        </div>
        <h3 class="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
          {{ searchQuery || selectedTag ? '未找到相关笔记' : '还没有笔记' }}
        </h3>
        <p class="text-xs text-slate-400 max-w-xs mb-5">
          {{ searchQuery || selectedTag ? '尝试更换搜索关键词或标签筛选' : '点击右下角按钮，随手拍张照片或记录当下想法吧' }}
        </p>
        <div class="flex flex-wrap gap-2 justify-center">
          <button
            v-if="notes.length === 0"
            @click="createSampleNotes"
            class="text-xs font-medium px-4 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-300 transition-all"
          >
            加载示例笔记
          </button>
          <button
            @click="openEditor(null)"
            class="text-xs font-semibold px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white shadow-xs transition-all flex items-center gap-1.5"
          >
            <Plus class="w-4 h-4" />
            <span>新建笔记</span>
          </button>
        </div>
      </div>

      <!-- 笔记列表/瀑布流布局 -->
      <div
        v-else
        class="grid gap-3 transition-all duration-200"
        :class="layoutMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'"
      >
        <NoteCard
          v-for="note in filteredNotes"
          :key="note.id"
          :note="note"
          @click-note="openDetail(note)"
          @toggle-pin="handleTogglePin"
          @view-image="handleViewImage"
          @filter-tag="selectedTag = $event"
          @edit-note="openEditor(note)"
          @delete-note="handleDeleteNote"
        />
      </div>
    </main>

    <!-- 底部右下角悬浮新建按钮 (FAB) - 极佳的手机单手大拇指触及区 -->
    <div class="fixed bottom-6 right-5 z-30 pb-safe-bottom">
      <button
        @click="openEditor(null)"
        class="w-14 h-14 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white shadow-lg shadow-primary-600/35 hover:shadow-primary-600/50 active:scale-90 hover:scale-105 transition-all duration-200 flex items-center justify-center group"
        title="新建笔记"
      >
        <Plus class="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
      </button>
    </div>

    <!-- 全屏笔记详情阅读页 -->
    <NoteDetail
      v-model:visible="detailVisible"
      :note="viewingNote"
      @close="detailVisible = false"
      @edit="handleEditFromDetail"
      @toggle-pin="handleTogglePin"
      @delete="handleDeleteNote"
      @preview-image="handleViewImage"
      @update-note="handleUpdateNoteDirectly"
    />

    <!-- 笔记编辑器弹窗 (全屏沉浸式) -->
    <NoteEditor
      v-model:visible="editorVisible"
      :note="editingNote"
      :all-tags="allTags"
      @save="handleSaveNote"
      @preview-image="handleViewImage"
    />

    <!-- 全屏图片查看器/灯箱 -->
    <ImageViewer
      v-model:visible="viewerVisible"
      :images="viewerImages"
      :start-index="viewerStartIndex"
    />

    <!-- 设置与同步弹窗 -->
    <SettingsModal
      v-model:visible="settingsVisible"
      @push-github="handlePushGithub"
      @pull-github="handlePullGithub"
      @export-backup="handleExportBackup"
      @import-backup="handleImportBackup"
      @clear-data="handleClearData"
    />

    <!-- 全局轻量 Toast 提示 -->
    <Toast />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import Header from './components/Header.vue';
import NoteCard from './components/NoteCard.vue';
import NoteDetail from './components/NoteDetail.vue';
import NoteEditor from './components/NoteEditor.vue';
import ImageViewer from './components/ImageViewer.vue';
import SettingsModal from './components/SettingsModal.vue';
import Toast from './components/Toast.vue';
import { Plus, BookOpen } from 'lucide-vue-next';
import { getAllNotes, saveNote, deleteNote, clearAllLocalData } from './db/indexedDB';
import { getGithubConfig, pushNotesToGithub, pullNotesFromGithub } from './services/githubSync';
import { exportNotesBackup, importNotesBackup } from './services/backupService';
import { useToast } from './composables/useToast';

const { showToast } = useToast();

const notes = ref([]);
const searchQuery = ref('');
const selectedTag = ref('');
const layoutMode = ref('grid'); // 'grid' | 'list'
const isSyncing = ref(false);

const editorVisible = ref(false);
const editingNote = ref(null);

const detailVisible = ref(false);
const viewingNote = ref(null);

const viewerVisible = ref(false);
const viewerImages = ref([]);
const viewerStartIndex = ref(0);

const settingsVisible = ref(false);

// 加载笔记
async function loadNotes() {
  notes.value = await getAllNotes();
}

onMounted(async () => {
  await loadNotes();
});

function openDetail(note) {
  viewingNote.value = note;
  detailVisible.value = true;
}

function handleEditFromDetail(note) {
  editingNote.value = note;
  editorVisible.value = true;
}

async function handleUpdateNoteDirectly(updatedNote) {
  viewingNote.value = { ...updatedNote };
  await handleSaveNote(updatedNote);
}

// 计算所有不重复标签
const allTags = computed(() => {
  const set = new Set();
  for (const n of notes.value) {
    if (n.tags && Array.isArray(n.tags)) {
      n.tags.forEach((t) => {
        if (t) set.add(t.trim());
      });
    }
  }
  return Array.from(set);
});

// 计算是否配置了 GitHub 同步
const hasSyncConfig = computed(() => {
  const cfg = getGithubConfig();
  return !!(cfg && cfg.token && cfg.repo);
});

// 筛选与搜索计算
const filteredNotes = computed(() => {
  let list = notes.value;

  if (selectedTag.value) {
    list = list.filter((n) => n.tags && n.tags.includes(selectedTag.value));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter((n) => {
      const matchTitle = n.title && n.title.toLowerCase().includes(q);
      const matchContent = n.content && n.content.toLowerCase().includes(q);
      const matchTag = n.tags && n.tags.some((t) => t.toLowerCase().includes(q));
      return matchTitle || matchContent || matchTag;
    });
  }

  return list;
});

function toggleLayout() {
  layoutMode.value = layoutMode.value === 'grid' ? 'list' : 'grid';
}

function openEditor(note = null) {
  editingNote.value = note;
  editorVisible.value = true;
}

function openSettings() {
  settingsVisible.value = true;
}

// 保存笔记
async function handleSaveNote(noteData) {
  try {
    // 1. 乐观更新：立刻在内存中显示/更新，无需等待任何异步 I/O，0毫秒呈现
    const existingIdx = notes.value.findIndex((n) => n.id === noteData.id);
    if (existingIdx > -1) {
      notes.value[existingIdx] = { ...noteData };
    } else {
      notes.value.unshift({ ...noteData });
    }

    // 若当前正在全屏查看该笔记，同步更新查看视图
    if (viewingNote.value && viewingNote.value.id === noteData.id) {
      viewingNote.value = { ...noteData };
    }

    // 2. 双重持久化存储 (LocalStorage + IndexedDB)
    await saveNote(noteData);
    await loadNotes();
    showToast('笔记已保存', 'success');

    // 如果配置了自动同步，尝试后台推送到 GitHub
    const cfg = getGithubConfig();
    if (cfg && cfg.token && cfg.repo && cfg.autoSync) {
      pushNotesToGithub(notes.value).catch(console.warn);
    }
  } catch (err) {
    showToast(`保存失败: ${err.message}`, 'error');
  }
}

// 切换置顶
async function handleTogglePin(note) {
  try {
    note.isPinned = !note.isPinned;
    if (viewingNote.value && viewingNote.value.id === note.id) {
      viewingNote.value.isPinned = note.isPinned;
    }
    await saveNote(note);
    await loadNotes();
    showToast(note.isPinned ? '已置顶' : '已取消置顶', 'info');
  } catch (err) {
    showToast(`操作失败: ${err.message}`, 'error');
  }
}

// 删除笔记
async function handleDeleteNote(note) {
  if (window.confirm(`确定要删除笔记 “${note.title || '此笔记'}” 吗？`)) {
    try {
      notes.value = notes.value.filter((n) => n.id !== note.id);
      if (viewingNote.value && viewingNote.value.id === note.id) {
        detailVisible.value = false;
        viewingNote.value = null;
      }
      await deleteNote(note.id);
      await loadNotes();
      showToast('已删除笔记', 'info');
    } catch (err) {
      showToast(`删除失败: ${err.message}`, 'error');
    }
  }
}

// 查看大图
function handleViewImage({ images, index }) {
  viewerImages.value = images;
  viewerStartIndex.value = index || 0;
  viewerVisible.value = true;
}

// 快速同步 (点击顶栏云朵)
async function handleQuickSync() {
  if (!hasSyncConfig.value) {
    openSettings();
    showToast('请先配置 GitHub Token 和仓库', 'info');
    return;
  }
  await handlePushGithub();
}

// 推送到 GitHub
async function handlePushGithub() {
  isSyncing.value = true;
  try {
    const res = await pushNotesToGithub(notes.value);
    showToast('已成功备份至 GitHub 仓库！', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isSyncing.value = false;
  }
}

// 从 GitHub 拉取
async function handlePullGithub() {
  isSyncing.value = true;
  try {
    const res = await pullNotesFromGithub();
    if (res.notes && res.notes.length > 0) {
      for (const n of res.notes) {
        await saveNote(n);
      }
      await loadNotes();
      showToast(`成功从 GitHub 同步了 ${res.notes.length} 条笔记`, 'success');
    } else {
      showToast('远程仓库中没有笔记数据', 'info');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isSyncing.value = false;
  }
}

// 导出备份
async function handleExportBackup() {
  try {
    const res = await exportNotesBackup();
    showToast(`已导出 ${res.count} 条笔记`, 'success');
  } catch (err) {
    showToast(`导出失败: ${err.message}`, 'error');
  }
}

// 导入备份
async function handleImportBackup(file) {
  try {
    const res = await importNotesBackup(file);
    await loadNotes();
    showToast(`成功导入 ${res.count} 条笔记`, 'success');
  } catch (err) {
    showToast(`导入失败: ${err.message}`, 'error');
  }
}

// 清空本地数据
async function handleClearData() {
  try {
    await clearAllLocalData();
    await loadNotes();
    showToast('已清空本地数据', 'info');
  } catch (err) {
    showToast(`清空失败: ${err.message}`, 'error');
  }
}

// 快速生成精美的示例笔记
async function createSampleNotes() {
  const sample1 = {
    id: 'note_welcome',
    title: '👋 欢迎使用随手记 Pocket Notes',
    content: '这是一个专为手机端优化、纯静态托管在 GitHub 上的轻量笔记应用。\n\n特点：\n- 📸 拍照与相册：支持手机直接拍照或批量传图，前端智能高清压缩。\n- 💾 双重存储：默认纯本地离线保存，也可一键绑定 GitHub 仓库实现永久多端备份。\n- 📱 手机专属体验：可在手机浏览器点击“添加到主屏幕”，享受原生 App 般的流畅全屏体验！',
    tags: ['指南', '功能介绍'],
    isPinned: true,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sample2 = {
    id: 'note_demo_todo',
    title: '📝 今日待办与随想',
    content: '- [x] 部署随手记到 GitHub Pages\n- [x] 在手机 Safari / Chrome 浏览器打开网址\n- [ ] 点击添加到主屏幕体验原生全屏\n- [ ] 随手拍两张照片记录生活',
    tags: ['待办', '清单'],
    isPinned: false,
    images: [],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  };

  await saveNote(sample1);
  await saveNote(sample2);
  await loadNotes();
  showToast('已创建示例笔记', 'success');
}
</script>
