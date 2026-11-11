# 📱 随手记 (Pocket Notes) - 手机端轻量图文云笔记

> 专为手机端打造的高颜值、轻量图文笔记应用。**支持直接拍照、多选相册照片、智能图片高清压缩、分类标签、快速全文搜索**，并可一键托管到 **GitHub Pages**，手机浏览器随时随地打开使用。

---

## ✨ 核心特性

- 📸 **照片与文字双全**：
  - 手机直接调起相机拍照
  - 批量选取相册多张照片
  - **内置智能前端图片压缩算法**：手机拍摄的 5MB~15MB 原图自动优化压缩为 ~150KB 高清图，画质无损且不占手机存储
  - 全屏多图相册预览（支持左右滑动切换、手势缩放、原图下载）
- 📝 **便携记事与轻量排版**：
  - 标题 + 正文快速记录
  - 快捷插入：待办清单 `[ ]`、无序列表 `-`、加粗 `**`、当前时间戳 `[12:30]`
  - 多标签分类系统（如 `#工作`、`#日常`、`#灵感`）
  - 置顶重要笔记、按时间自动排序、实时全文搜索
- ☁️ **双重存储 & GitHub 永久同步**：
  - **离线原生（默认）**：基于浏览器 IndexedDB 大容量本地存储，无网络也能秒开秒存，打开即用无需登录
  - **GitHub 云端备份（可选）**：在设置中填入你的 GitHub Token，即可一键把全部图文笔记自动备份到你个人的 GitHub 仓库中，跨手机、电脑多端数据同步
  - **本地数据导入与导出**：一键导出 `.json` 离线备份文件，随时随地迁移与恢复
- 📲 **手机极致体验 (PWA)**：
  - 手机浏览器点击「添加到主屏幕」，即可如原生 App 般全屏运行，无地址栏遮挡
  - 专为大拇指优化的悬浮新建按钮与底部安全区适配（全面屏/iPhone 刘海及底部横条）

---

## 🚀 三步上手：如何部署到 GitHub 并在手机上使用

### 第一步：创建 GitHub 仓库并上传代码

1. 登录你的 [GitHub](https://github.com/) 账号，点击右上角 **New repository** 创建一个新仓库，例如命名为 `pocket-notes`（建议选择 Public 公开，若选 Private 私有需通过 GitHub Pages 免费配置或配合 Token 使用）。
2. 在电脑终端进入本项目文件夹，执行以下命令上传代码：

```bash
cd /path/to/github-note-app
git init
git add .
git commit -m "feat: 初次提交随手记项目"
git branch -M main
git remote add origin https://github.com/<你的GitHub用户名>/pocket-notes.git
git push -u origin main
```

---

### 第二步：开启 GitHub Pages 静态网站

代码推送到 GitHub 后，开启免费网页托管：

1. 打开刚刚创建的 GitHub 仓库页面，点击上方的 **Settings**（设置）。
2. 在左侧菜单找到并点击 **Pages**。
3. 在 **Build and deployment** 下方的 **Source** 选项中：
   - **方式一（推荐，全自动构建）**：选择 **GitHub Actions**。
     - 项目已内置 `.github/workflows/deploy.yml` 自动化脚本，推送代码后会自动完成构建与发布。
   - **方式二（最简方式）**：选择 **Deploy from a branch**：
     - Branch 选择 `main` 分支，文件夹选择 `/docs`，点击 **Save**。
4. 等待 1~2 分钟刷新页面，上方就会出现你的专属网页地址：  
   👉 `https://<你的GitHub用户名>.github.io/pocket-notes/`

---

### 第三步：手机浏览器打开 & 添加到桌面

1. 在手机上用浏览器（如 **iPhone Safari** 或 **安卓 Chrome/系统浏览器**）打开上述生成的专属网址。
2. **体验原生 App 效果（强烈推荐）**：
   - **iPhone (Safari)**：点击屏幕底部的「分享」按钮（带向上箭头的方框）➔ 往下滑动点击 **「添加到主屏幕」** ➔ 点击右上角「添加」。
   - **Android (Chrome)**：点击右上角三个点菜单 ➔ 点击 **「添加到主屏幕」** 或 **「安装应用」**。
3. 你的手机桌面上就会出现「随手记」图标，点击即可像原生 App 一样秒开使用！

---

## 🔐 (可选) 配置 GitHub 云端备份与多端同步

如果你希望在手机上拍的照片和写的笔记能够**永久安全保存在 GitHub 仓库**中，并在其他手机或电脑上同步：

1. 在电脑或手机浏览器打开 GitHub，点击头像 ➔ **Settings** ➔ 页面最左下方 **Developer settings**。
2. 点击 **Personal access tokens** ➔ **Tokens (classic)** ➔ **Generate new token**。
3. Note 填写 `pocket-notes`，勾选 **repo** 权限（完整仓库访问），点击页面底部绿色 **Generate token**。
4. 复制生成的密钥（形如 `ghp_xxxxxxxxxxxx`）。
5. 打开手机上的随手记 ➔ 点击右上角「设置」图标 ➔ 在 GitHub 同步面板填入：
   - **Token**：刚刚复制的密钥
   - **仓库路径**：`<你的用户名>/pocket-notes`（或者你专用于存笔记的任意私有仓库）
6. 点击「测试连接」➔ 成功后点击「推送到 GitHub」即可完成云端备份！

---

## 🛠️ 本地开发与二次开发

本项目使用 Vue 3 + Tailwind CSS + Lucide Icons 构建：

```bash
# 1. 安装依赖
npm install

# 2. 启动本地开发服务 (支持局域网手机实时预览)
npm run dev -- --host

# 3. 构建打包生产环境 (自动同步至 dist 和 docs 目录)
npm run build
```

---

## 📄 许可证

MIT License. 自由修改、分发与个人使用。
