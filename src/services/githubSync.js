/**
 * GitHub 仓库数据同步服务
 * 利用 GitHub REST API 直接将笔记数据同步/备份到用户个人的 GitHub 仓库中
 */

const STORAGE_KEY = 'pocket_notes_github_config';

export function getGithubConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('读取 GitHub 配置失败', e);
  }
  return {
    token: '',
    repo: '', // 格式: "用户名/仓库名"
    branch: 'main',
    filePath: 'data/notes-backup.json',
    autoSync: false,
    lastSynced: null,
  };
}

export function saveGithubConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// UTF-8 安全的 Base64 编码 (解决中文字符/表情包 btoa 报错问题)
export function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// UTF-8 安全的 Base64 解码
export function base64ToUtf8(base64) {
  const binary = atob(base64.replace(/\s/g, ''));
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * 测试 GitHub Token 和仓库连接
 */
export async function testGithubConnection(token, repo) {
  if (!token || !repo) {
    throw new Error('请先填写 GitHub Token 和仓库名称');
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const url = `https://api.github.com/repos/${cleanRepo}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Token 无效或已过期，请检查权限');
    if (res.status === 404) throw new Error('仓库不存在或该 Token 无权访问此私有仓库');
    throw new Error(`连接失败 (HTTP ${res.status}): ${res.statusText}`);
  }

  const data = await res.json();
  return {
    fullName: data.full_name,
    isPrivate: data.private,
    defaultBranch: data.default_branch,
  };
}

/**
 * 推送笔记数据到 GitHub 仓库
 */
export async function pushNotesToGithub(notes, customConfig = null) {
  const config = customConfig || getGithubConfig();
  const { token, repo, branch = 'main', filePath = 'data/notes-backup.json' } = config;

  if (!token || !repo) {
    throw new Error('未配置 GitHub Token 或仓库');
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const cleanBranch = branch.trim() || 'main';
  const cleanPath = filePath.trim().replace(/^\//, '');

  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${cleanBranch}`;

  // 1. 获取现有文件的 sha（如果存在）
  let existingSha = null;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    if (getRes.ok) {
      const fileData = await getRes.json();
      existingSha = fileData.sha;
    }
  } catch (e) {
    console.warn('获取旧文件信息失败，尝试直接创建', e);
  }

  // 2. 准备提交内容
  const payloadData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    notesCount: notes.length,
    notes: notes,
  };

  const jsonString = JSON.stringify(payloadData, null, 2);
  const base64Content = utf8ToBase64(jsonString);

  // 3. 提交更新到 GitHub
  const body = {
    message: `Sync notes: ${new Date().toLocaleString('zh-CN')} (${notes.length} 条笔记)`,
    content: base64Content,
    branch: cleanBranch,
  };
  if (existingSha) {
    body.sha = existingSha;
  }

  const putRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const errData = await putRes.json().catch(() => ({}));
    throw new Error(`推送到 GitHub 失败: ${errData.message || putRes.statusText}`);
  }

  // 更新最后同步时间
  const updatedConfig = {
    ...config,
    lastSynced: new Date().toISOString(),
  };
  saveGithubConfig(updatedConfig);

  return { success: true, timestamp: updatedConfig.lastSynced };
}

/**
 * 从 GitHub 仓库拉取最新笔记数据
 */
export async function pullNotesFromGithub(customConfig = null) {
  const config = customConfig || getGithubConfig();
  const { token, repo, branch = 'main', filePath = 'data/notes-backup.json' } = config;

  if (!token || !repo) {
    throw new Error('未配置 GitHub Token 或仓库');
  }

  const cleanRepo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
  const cleanBranch = branch.trim() || 'main';
  const cleanPath = filePath.trim().replace(/^\//, '');

  const apiUrl = `https://api.github.com/repos/${cleanRepo}/contents/${cleanPath}?ref=${cleanBranch}`;

  const res = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${token.trim()}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`仓库中未找到文件 ${cleanPath}，请先执行一次“推送到 GitHub”`);
    }
    throw new Error(`拉取失败 (HTTP ${res.status}): ${res.statusText}`);
  }

  const fileData = await res.json();
  if (!fileData.content) {
    throw new Error('未能读取到文件内容');
  }

  const decodedJson = base64ToUtf8(fileData.content);
  const parsed = JSON.parse(decodedJson);

  let notesArray = [];
  if (Array.isArray(parsed)) {
    notesArray = parsed;
  } else if (parsed && Array.isArray(parsed.notes)) {
    notesArray = parsed.notes;
  } else {
    throw new Error('远程数据格式无法识别');
  }

  // 更新最后同步时间
  const updatedConfig = {
    ...config,
    lastSynced: new Date().toISOString(),
  };
  saveGithubConfig(updatedConfig);

  return {
    notes: notesArray,
    exportedAt: parsed.exportedAt || null,
    timestamp: updatedConfig.lastSynced,
  };
}
