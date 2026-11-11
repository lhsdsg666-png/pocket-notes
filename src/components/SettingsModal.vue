<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 scale-95"
    enter-to-class="opacity-100 scale-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100 scale-100"
    leave-to-class="opacity-0 scale-95"
  >
    <div
      v-if="visible"
      class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      @click.self="close"
    >
      <div
        class="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800"
      >
        <!-- 弹窗标题 -->
        <div class="px-5 py-3.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-2">
            <Settings class="w-5 h-5 text-primary-600" />
            <h2 class="text-base font-bold text-slate-800 dark:text-slate-100">系统设置与同步</h2>
          </div>
          <button
            @click="close"
            class="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- 选项卡切换 -->
        <div class="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2">
          <button
            @click="activeTab = 'github'"
            class="pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5"
            :class="activeTab === 'github' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <Cloud class="w-4 h-4" />
            <span>GitHub 同步</span>
          </button>
          <button
            @click="activeTab = 'storage'"
            class="pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5"
            :class="activeTab === 'storage' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <HardDrive class="w-4 h-4" />
            <span>数据与存储</span>
          </button>
          <button
            @click="activeTab = 'help'"
            class="pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5"
            :class="activeTab === 'help' ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-800'"
          >
            <Smartphone class="w-4 h-4" />
            <span>手机桌面使用</span>
          </button>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4 smooth-scroll text-sm">
          <!-- TAB 1: GitHub 云端同步 -->
          <div v-if="activeTab === 'github'" class="space-y-4">
            <div class="p-3 bg-primary-50 dark:bg-primary-950/30 rounded-2xl border border-primary-100 dark:border-primary-900 text-xs text-primary-800 dark:text-primary-200 leading-relaxed">
              💡 <b>多端备份与云端存储</b>：配置 GitHub Token 后，手机上的文字和照片将自动备份到你的私有或公开 GitHub 仓库中，跨手机和电脑均可永久保存。
            </div>

            <!-- Token 输入 -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                GitHub 个人访问令牌 (Personal Access Token)
              </label>
              <div class="relative flex items-center">
                <input
                  v-model="githubConfig.token"
                  :type="showToken ? 'text' : 'password'"
                  placeholder="ghp_xxxxxxxxxxxx"
                  class="w-full text-xs font-mono px-3 py-2 pr-9 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  @click="showToken = !showToken"
                  class="absolute right-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Eye v-if="!showToken" class="w-4 h-4" />
                  <EyeOff v-else class="w-4 h-4" />
                </button>
              </div>
            </div>

            <!-- 仓库名称输入 -->
            <div>
              <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                GitHub 仓库路径 (格式: 用户名/仓库名)
              </label>
              <input
                v-model="githubConfig.repo"
                type="text"
                placeholder="例如: your-username/my-notes"
                class="w-full text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <!-- 分支与文件路径 (可折叠高级选项) -->
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">分支</label>
                <input
                  v-model="githubConfig.branch"
                  type="text"
                  placeholder="main"
                  class="w-full text-xs font-mono px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">文件路径</label>
                <input
                  v-model="githubConfig.filePath"
                  type="text"
                  placeholder="data/notes-backup.json"
                  class="w-full text-xs font-mono px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <!-- 操作按钮组 -->
            <div class="pt-2 flex flex-col gap-2">
              <div class="flex gap-2">
                <button
                  @click="testConnection"
                  :disabled="isTesting"
                  class="flex-1 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isTesting }" />
                  <span>测试连接</span>
                </button>
                <button
                  @click="saveConfig"
                  class="flex-1 py-2 rounded-xl text-xs font-medium bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all"
                >
                  保存设置
                </button>
              </div>

              <!-- 立即同步按钮 -->
              <div class="grid grid-cols-2 gap-2 pt-1">
                <button
                  @click="$emit('push-github')"
                  :disabled="!githubConfig.token || !githubConfig.repo"
                  class="py-2.5 rounded-xl text-xs font-medium bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-700 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                >
                  <UploadCloud class="w-4 h-4" />
                  <span>推送到 GitHub</span>
                </button>
                <button
                  @click="$emit('pull-github')"
                  :disabled="!githubConfig.token || !githubConfig.repo"
                  class="py-2.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700"
                >
                  <DownloadCloud class="w-4 h-4" />
                  <span>从 GitHub 拉取</span>
                </button>
              </div>

              <!-- 上次同步时间显示 -->
              <p v-if="githubConfig.lastSynced" class="text-[11px] text-center text-slate-400">
                最近同步: {{ new Date(githubConfig.lastSynced).toLocaleString('zh-CN') }}
              </p>
            </div>

            <!-- 新手教程提示 -->
            <details class="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <summary class="font-medium cursor-pointer text-primary-600 dark:text-primary-400">
                📘 如何生成免费的 GitHub Token？(点击查看)
              </summary>
              <div class="mt-2 space-y-1.5 leading-relaxed text-slate-600 dark:text-slate-300">
                <p>1. 登录电脑或手机浏览器打开 <b>github.com</b></p>
                <p>2. 点击右上角头像 ➔ <b>Settings</b> ➔ 页面底部 <b>Developer Settings</b></p>
                <p>3. 选择 <b>Personal access tokens</b> ➔ <b>Tokens (classic)</b></p>
                <p>4. 点击 <b>Generate new token</b>，Note 写 <code>pocket-notes</code>，有效期建议选 No expiration 或 90 天</p>
                <p>5. 勾选权限：<b>repo</b> (完整仓库访问权限)</p>
                <p>6. 点击底部绿色 <b>Generate token</b>，复制生成的 <code>ghp_...</code> 密钥粘贴至上方输入框即可！</p>
              </div>
            </details>
          </div>

          <!-- TAB 2: 数据与本地存储 -->
          <div v-else-if="activeTab === 'storage'" class="space-y-4">
            <!-- 统计信息 -->
            <div class="grid grid-cols-3 gap-2">
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center border border-slate-200/60 dark:border-slate-700">
                <div class="text-lg font-bold text-slate-800 dark:text-slate-100">{{ stats.notesCount }}</div>
                <div class="text-[11px] text-slate-400">笔记条数</div>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center border border-slate-200/60 dark:border-slate-700">
                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">{{ stats.imageCount }}</div>
                <div class="text-[11px] text-slate-400">照片数量</div>
              </div>
              <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-center border border-slate-200/60 dark:border-slate-700">
                <div class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ stats.estimatedSizeMB }} MB</div>
                <div class="text-[11px] text-slate-400">本地占用</div>
              </div>
            </div>

            <!-- 导入与导出 -->
            <div class="space-y-2 pt-2">
              <h4 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">数据备份与迁移</h4>

              <button
                @click="$emit('export-backup')"
                class="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-98 transition-all flex items-center justify-between text-xs"
              >
                <div class="flex items-center gap-2">
                  <Download class="w-4 h-4 text-primary-600" />
                  <span>导出本地数据备份 (.JSON)</span>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-400" />
              </button>

              <label
                class="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 active:scale-98 transition-all flex items-center justify-between text-xs cursor-pointer"
              >
                <div class="flex items-center gap-2">
                  <Upload class="w-4 h-4 text-indigo-600" />
                  <span>从文件恢复数据 (.JSON)</span>
                </div>
                <ChevronRight class="w-4 h-4 text-slate-400" />
                <input
                  type="file"
                  accept=".json,application/json"
                  class="hidden"
                  @change="handleImportFile"
                />
              </label>
            </div>

            <!-- 清空数据危险区域 -->
            <div class="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h4 class="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-2">危险区域</h4>
              <button
                @click="confirmClear"
                class="w-full py-2 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 active:scale-98 transition-all text-xs font-medium border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-1.5"
              >
                <Trash2 class="w-4 h-4" />
                <span>清空手机本地所有笔记与图片</span>
              </button>
            </div>
          </div>

          <!-- TAB 3: 手机桌面与 PWA 使用指南 -->
          <div v-else-if="activeTab === 'help'" class="space-y-4">
            <div class="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              ✨ <b>强烈推荐</b>：将本网页「添加到手机主屏幕」，即可享受与原生 App 完全一致的全屏沉浸体验，打开飞速且支持离线！
            </div>

            <!-- 苹果 iOS 教程 -->
            <div class="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div class="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                <span>🍎 苹果 iPhone (Safari 浏览器)</span>
              </div>
              <ol class="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>在 Safari 浏览器中打开本笔记网页</li>
                <li>点击底部正中间的 <b>分享</b> 图标（带向上箭头的方框）</li>
                <li>在弹出的菜单中往下滑，点击 <b>「添加到主屏幕」</b></li>
                <li>确认名称后点击右上角「添加」，手机桌面上就会出现随手记图标！</li>
              </ol>
            </div>

            <!-- 安卓 Android 教程 -->
            <div class="bg-slate-50 dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <div class="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 text-xs">
                <span>🤖 安卓手机 (Chrome / 微信 / 自带浏览器)</span>
              </div>
              <ol class="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside leading-relaxed">
                <li>在 Chrome 或系统自带浏览器中打开本网页</li>
                <li>点击右上角 <b>三个点（菜单）</b></li>
                <li>点击 <b>「添加到主屏幕」</b> 或 <b>「安装应用」</b></li>
                <li>之后直接在手机桌面图标打开即可！</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- 底部安全区 -->
        <div class="pb-safe-bottom bg-white dark:bg-slate-900"></div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import {
  Settings,
  X,
  Cloud,
  HardDrive,
  Smartphone,
  Eye,
  EyeOff,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Download,
  Upload,
  Trash2,
  ChevronRight,
} from 'lucide-vue-next';
import { getGithubConfig, saveGithubConfig, testGithubConnection } from '../services/githubSync';
import { getStorageStats } from '../db/indexedDB';
import { useToast } from '../composables/useToast';

const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:visible',
  'push-github',
  'pull-github',
  'export-backup',
  'import-backup',
  'clear-data',
]);

const { showToast } = useToast();

const activeTab = ref('github');
const showToken = ref(false);
const isTesting = ref(false);

const githubConfig = reactive({
  token: '',
  repo: '',
  branch: 'main',
  filePath: 'data/notes-backup.json',
  lastSynced: null,
});

const stats = reactive({
  notesCount: 0,
  imageCount: 0,
  estimatedSizeMB: '0.00',
});

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      // 加载配置
      const cfg = getGithubConfig();
      Object.assign(githubConfig, cfg);

      // 加载存储统计
      await updateStats();
    }
  }
);

async function updateStats() {
  const s = await getStorageStats();
  Object.assign(stats, s);
}

function close() {
  emit('update:visible', false);
}

function saveConfig() {
  saveGithubConfig(githubConfig);
  showToast('GitHub 配置已保存', 'success');
}

async function testConnection() {
  if (!githubConfig.token || !githubConfig.repo) {
    showToast('请先输入 Token 和仓库名称', 'warning');
    return;
  }

  isTesting.value = true;
  try {
    const res = await testGithubConnection(githubConfig.token, githubConfig.repo);
    showToast(`连接成功! 仓库: ${res.fullName} (${res.isPrivate ? '私有' : '公开'})`, 'success');
    saveGithubConfig(githubConfig);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    isTesting.value = false;
  }
}

function handleImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  emit('import-backup', file);
  e.target.value = '';
}

function confirmClear() {
  if (window.confirm('⚠️ 警告：确定要清空本地所有笔记和照片吗？此操作无法撤销！建议先导出备份。')) {
    emit('clear-data');
  }
}
</script>
