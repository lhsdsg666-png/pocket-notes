<template>
  <header class="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
    <!-- 顶部状态栏安全区填充 -->
    <div class="h-safe-top"></div>

    <!-- 主导航条 -->
    <div class="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
      <!-- 品牌/标题 -->
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-primary-400 flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
          <BookOpen class="w-4 h-4" />
        </div>
        <div>
          <h1 class="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">
            随手记
          </h1>
          <p class="text-[11px] text-slate-400 dark:text-slate-400 font-normal">
            {{ notesCount }} 条笔记 · {{ hasSyncConfig ? 'GitHub 已绑定' : '本地模式' }}
          </p>
        </div>
      </div>

      <!-- 右侧快捷操作按钮 -->
      <div class="flex items-center gap-1">
        <!-- 搜索展开按钮 -->
        <button
          @click="toggleSearch"
          class="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :class="{ 'text-primary-600 bg-primary-50 dark:bg-primary-950/40': isSearchOpen }"
          title="搜索"
        >
          <Search class="w-5 h-5" />
        </button>

        <!-- 布局切换 (单列 / 双列网格) -->
        <button
          @click="$emit('toggle-layout')"
          class="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title="切换视图"
        >
          <LayoutGrid v-if="layoutMode === 'list'" class="w-5 h-5" />
          <List v-else class="w-5 h-5" />
        </button>

        <!-- GitHub 同步状态 / 触发同步 -->
        <button
          @click="$emit('sync-clicked')"
          class="relative p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          :title="hasSyncConfig ? 'GitHub 同步' : '配置 GitHub 同步'"
        >
          <Cloud v-if="hasSyncConfig" class="w-5 h-5" :class="{ 'animate-pulse text-primary-600': isSyncing }" />
          <CloudOff v-else class="w-5 h-5 text-slate-400" />
          <!-- 绿点指示绑定状态 -->
          <span
            v-if="hasSyncConfig"
            class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
          ></span>
        </button>

        <!-- 设置按钮 -->
        <button
          @click="$emit('open-settings')"
          class="p-2 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all"
          title="设置"
        >
          <Settings class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- 展开的搜索框 -->
    <div
      v-if="isSearchOpen"
      class="max-w-4xl mx-auto px-4 pb-2.5 pt-1 transition-all"
    >
      <div class="relative flex items-center">
        <Search class="absolute left-3 w-4 h-4 text-slate-400" />
        <input
          ref="searchInputRef"
          type="text"
          :value="searchQuery"
          @input="$emit('update:searchQuery', $event.target.value)"
          placeholder="搜索笔记文字、标题或标签..."
          class="w-full pl-9 pr-8 py-2 text-sm bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400"
        />
        <button
          v-if="searchQuery"
          @click="$emit('update:searchQuery', '')"
          class="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- 标签横向滑动筛选栏 -->
    <div v-if="allTags.length > 0" class="max-w-4xl mx-auto px-4 pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
      <button
        @click="$emit('select-tag', '')"
        class="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all"
        :class="!selectedTag ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
      >
        全部 ({{ notesCount }})
      </button>

      <button
        v-for="tag in allTags"
        :key="tag"
        @click="$emit('select-tag', tag)"
        class="px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1"
        :class="selectedTag === tag ? 'bg-primary-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'"
      >
        <span>#{{ tag }}</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { BookOpen, Search, LayoutGrid, List, Cloud, CloudOff, Settings, X } from 'lucide-vue-next';

const props = defineProps({
  notesCount: { type: Number, default: 0 },
  allTags: { type: Array, default: () => [] },
  selectedTag: { type: String, default: '' },
  searchQuery: { type: String, default: '' },
  layoutMode: { type: String, default: 'grid' },
  hasSyncConfig: { type: Boolean, default: false },
  isSyncing: { type: Boolean, default: false },
});

const emit = defineEmits([
  'toggle-layout',
  'sync-clicked',
  'open-settings',
  'select-tag',
  'update:searchQuery',
]);

const isSearchOpen = ref(false);
const searchInputRef = ref(null);

function toggleSearch() {
  isSearchOpen.value = !isSearchOpen.value;
  if (isSearchOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus();
    });
  } else {
    emit('update:searchQuery', '');
  }
}
</script>
