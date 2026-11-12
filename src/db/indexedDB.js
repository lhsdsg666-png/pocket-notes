import { openDB } from 'idb';

const DB_NAME = 'PocketNotesDB';
const DB_VERSION = 2; // 升级版本号，确保表结构初始化完整

let dbPromise = null;

// 工具函数：深度转换任意对象为纯原生 JSON 对象（彻底剥离 Vue 3 Proxy 响应式代理）
function toPlainObject(obj) {
  if (!obj) return obj;
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (e) {
    console.warn('toPlainObject 序列化警告:', e);
    return obj;
  }
}

// LocalStorage 兜底机制：防止某些手机隐私模式/无痕浏览完全禁用 IndexedDB
const FALLBACK_KEY = 'pocket_notes_ls_fallback';

function getFallbackNotes() {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFallbackNotes(notes) {
  try {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('LocalStorage 兜底写入失败:', e);
  }
}

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // 笔记存储表
        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('updatedAt', 'updatedAt');
          noteStore.createIndex('createdAt', 'createdAt');
          noteStore.createIndex('isPinned', 'isPinned');
        }

        // 图片存储表 (支持大容量存储)
        if (!db.objectStoreNames.contains('images')) {
          const imageStore = db.createObjectStore('images', { keyPath: 'id' });
          imageStore.createIndex('noteId', 'noteId');
          imageStore.createIndex('createdAt', 'createdAt');
        }
      },
      blocked() {
        console.warn('IndexedDB 升级被其他标签页阻挡');
      },
      blocking() {
        if (dbPromise) {
          dbPromise.then(db => db.close());
          dbPromise = null;
        }
      }
    });
  }
  return dbPromise;
}

// 笔记 CRUD 操作
export async function getAllNotes() {
  try {
    const db = await getDB();
    const notes = await db.getAll('notes');
    return notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
  } catch (err) {
    console.warn('从 IndexedDB 读取失败，启用 LocalStorage 兜底:', err);
    const fallback = getFallbackNotes();
    return fallback.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
  }
}

export async function getNoteById(id) {
  try {
    const db = await getDB();
    return await db.get('notes', id);
  } catch (err) {
    const list = getFallbackNotes();
    return list.find(n => n.id === id) || null;
  }
}

export async function saveNote(note) {
  const now = new Date().toISOString();
  // 必须深拷贝纯对象，剔除 Vue 3 的 Proxy 响应式对象，防止 IndexedDB 报 DataCloneError: The object could not be cloned
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

  try {
    const db = await getDB();
    await db.put('notes', record);
  } catch (err) {
    console.warn('IndexedDB put 失败，尝试 LocalStorage 兜底:', err);
    try {
      const list = getFallbackNotes();
      const idx = list.findIndex(n => n.id === record.id);
      if (idx > -1) {
        list[idx] = record;
      } else {
        list.push(record);
      }
      saveFallbackNotes(list);
    } catch (lsErr) {
      throw new Error('存储受限，请退出无痕/私密浏览模式或清理手机存储后重试: ' + err.message);
    }
  }

  return record;
}

export async function deleteNote(id) {
  try {
    const db = await getDB();
    const tx = db.transaction(['notes', 'images'], 'readwrite');
    const noteStore = tx.objectStore('notes');
    const imageStore = tx.objectStore('images');
    
    const note = await noteStore.get(id);
    if (note && note.images) {
      for (const img of note.images) {
        if (img && img.id) {
          await imageStore.delete(img.id);
        }
      }
    }
    await noteStore.delete(id);
    await tx.done;
  } catch (err) {
    console.warn('IndexedDB 删除失败，从 LocalStorage 兜底中删除:', err);
    const list = getFallbackNotes();
    const filtered = list.filter(n => n.id !== id);
    saveFallbackNotes(filtered);
  }
}

// 图片存储操作
export async function saveImageRecord(imageRecord) {
  const clean = toPlainObject(imageRecord);
  try {
    const db = await getDB();
    await db.put('images', clean);
  } catch (e) {
    console.warn('saveImageRecord 失败:', e);
  }
  return clean;
}

export async function getImageRecord(id) {
  try {
    const db = await getDB();
    return await db.get('images', id);
  } catch {
    return null;
  }
}

export async function deleteImageRecord(id) {
  try {
    const db = await getDB();
    await db.delete('images', id);
  } catch (e) {
    console.warn('deleteImageRecord 失败:', e);
  }
}

// 清空所有本地数据
export async function clearAllLocalData() {
  try {
    const db = await getDB();
    const tx = db.transaction(['notes', 'images'], 'readwrite');
    await tx.objectStore('notes').clear();
    await tx.objectStore('images').clear();
    await tx.done;
  } catch (err) {
    console.warn('清空 IndexedDB 失败:', err);
  }
  try {
    localStorage.removeItem(FALLBACK_KEY);
  } catch {}
}

// 获取存储概况（数据量统计）
export async function getStorageStats() {
  let notes = [];
  try {
    const db = await getDB();
    notes = await db.getAll('notes');
  } catch {
    notes = getFallbackNotes();
  }

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
