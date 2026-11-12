import { openDB } from 'idb';

const DB_NAME = 'PocketNotesDB_v2'; // 使用新数据库名，彻底避开任何旧版本的锁死或 blocked 状态
const DB_VERSION = 1;

let dbPromise = null;

// 工具函数：深度转换任意对象为纯原生 JSON 对象（彻底剥离 Vue 3 Proxy 响应式代理）
export function toPlainObject(obj) {
  if (!obj) return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.warn('toPlainObject 序列化警告:', e);
    return obj;
  }
}

// ========================
// LocalStorage 同步缓存层 (保证 0 延迟渲染与绝对可用)
// ========================
const LS_NOTES_KEY = 'pocket_notes_data_v2';

export function getLocalNotesFromLS() {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('读取 LocalStorage 失败:', e);
    return [];
  }
}

export function saveLocalNotesToLS(notes) {
  try {
    // 存入 LocalStorage 时，若数据过大则去除大图保留缩略图，防止超 5MB 限制
    const safeNotes = notes.map(n => {
      const copy = { ...n };
      if (copy.images && Array.isArray(copy.images)) {
        copy.images = copy.images.map(img => ({
          id: img.id,
          name: img.name,
          thumbnail: img.thumbnail, // 保留缩略图
          data: img.thumbnail || img.data, // 优先用缩略图避免超限
          size: img.size,
          type: img.type,
          createdAt: img.createdAt
        }));
      }
      return copy;
    });
    localStorage.setItem(LS_NOTES_KEY, JSON.stringify(safeNotes));
  } catch (e) {
    console.warn('写入 LocalStorage 警告 (可能已满):', e);
  }
}

// ========================
// IndexedDB 异步大容量存储 (带超时保护，绝不挂起 UI)
// ========================
export function getDB() {
  if (!dbPromise) {
    // 设置 1500ms 超时保护，若 IDB 打开被系统卡住，立即降级
    const openPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('notes')) {
          db.createObjectStore('notes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }
      },
      blocked() {
        console.warn('IndexedDB 打开被其他标签页阻挡，降级运行');
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then(db => db.close()).catch(() => {});
          dbPromise = null;
        }
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('IndexedDB 连接超时，自动降级至 LocalStorage')), 1500);
    });

    dbPromise = Promise.race([openPromise, timeoutPromise]).catch(err => {
      console.warn(err.message);
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

// 统一排序
function sortNotes(list) {
  return list.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });
}

// 获取所有笔记（双轨合并：LS + IDB）
export async function getAllNotes() {
  // 1. 首先读取 LocalStorage，确保即使离线或 IDB 卡顿时也有数据返回
  const lsNotes = getLocalNotesFromLS();

  try {
    const db = await getDB();
    const idbNotes = await db.getAll('notes');
    
    // 合并 IDB 和 LS 中的数据，以最新 updatedAt 为准
    const noteMap = new Map();
    for (const n of lsNotes) {
      if (n && n.id) noteMap.set(n.id, n);
    }
    for (const n of idbNotes) {
      if (n && n.id) {
        const exist = noteMap.get(n.id);
        if (!exist || new Date(n.updatedAt || 0) >= new Date(exist.updatedAt || 0)) {
          noteMap.set(n.id, n);
        }
      }
    }

    const merged = Array.from(noteMap.values());
    // 顺便回写 LS，保持同步
    saveLocalNotesToLS(merged);
    return sortNotes(merged);
  } catch (err) {
    console.warn('通过 LocalStorage 运行 getAllNotes:', err.message);
    return sortNotes(lsNotes);
  }
}

export async function getNoteById(id) {
  const lsNotes = getLocalNotesFromLS();
  const found = lsNotes.find(n => n.id === id);
  if (found) return found;

  try {
    const db = await getDB();
    return await db.get('notes', id);
  } catch {
    return null;
  }
}

// 保存笔记（双重存储：同时写入 LS 和 IDB）
export async function saveNote(note) {
  const now = new Date().toISOString();
  const clean = toPlainObject(note);
  const record = {
    ...clean,
    id: clean.id || ('note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
    title: clean.title || '',
    content: clean.content || '',
    updatedAt: now,
    createdAt: clean.createdAt || now,
    images: Array.isArray(clean.images) ? clean.images : [],
    tags: Array.isArray(clean.tags) ? clean.tags : [],
    isPinned: !!clean.isPinned,
  };

  // 1. 同步保存至 LocalStorage（立即生效，0 延迟）
  const currentList = getLocalNotesFromLS();
  const idx = currentList.findIndex(n => n.id === record.id);
  if (idx > -1) {
    currentList[idx] = record;
  } else {
    currentList.unshift(record);
  }
  saveLocalNotesToLS(currentList);

  // 2. 异步保存至 IndexedDB（支持存完整高清大图）
  try {
    const db = await getDB();
    await db.put('notes', record);
  } catch (err) {
    console.warn('IDB 异步存储跳过，已安全保存在 LocalStorage 中:', err.message);
  }

  return record;
}

// 删除笔记
export async function deleteNote(id) {
  // 1. 先从 LocalStorage 移除
  const currentList = getLocalNotesFromLS();
  const filtered = currentList.filter(n => n.id !== id);
  saveLocalNotesToLS(filtered);

  // 2. 再从 IndexedDB 移除
  try {
    const db = await getDB();
    await db.delete('notes', id);
  } catch (err) {
    console.warn('IDB delete 忽略:', err.message);
  }
}

// 清空所有本地数据
export async function clearAllLocalData() {
  try {
    localStorage.removeItem(LS_NOTES_KEY);
    localStorage.removeItem('pocket_notes_data');
    localStorage.removeItem('pocket_notes_ls_fallback');
  } catch {}

  try {
    const db = await getDB();
    await db.clear('notes');
    await db.clear('images');
  } catch (e) {
    console.warn('IDB clear 忽略:', e);
  }
}

// 获取存储概况
export async function getStorageStats() {
  const notes = await getAllNotes();
  let imageCount = 0;
  let totalEstimatedBytes = 0;

  for (const n of notes) {
    if (n.images && Array.isArray(n.images)) {
      imageCount += n.images.length;
      for (const img of n.images) {
        if (img && img.data) {
          totalEstimatedBytes += img.data.length;
        }
      }
    }
    if (n.content) totalEstimatedBytes += n.content.length * 2;
    if (n.title) totalEstimatedBytes += n.title.length * 2;
  }

  return {
    notesCount: notes.length,
    imageCount,
    estimatedSizeMB: (totalEstimatedBytes / (1024 * 1024)).toFixed(2),
  };
}
