import { openDB } from 'idb';

const DB_NAME = 'PocketNotesDB';
const DB_VERSION = 1;

let dbPromise = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
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
    });
  }
  return dbPromise;
}

// 笔记 CRUD 操作
export async function getAllNotes() {
  const db = await getDB();
  const notes = await db.getAll('notes');
  // 默认排序：置顶的在前面，其次按更新时间降序
  return notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }
    return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
  });
}

export async function getNoteById(id) {
  const db = await getDB();
  return await db.get('notes', id);
}

export async function saveNote(note) {
  const db = await getDB();
  const now = new Date().toISOString();
  const record = {
    ...note,
    updatedAt: now,
    createdAt: note.createdAt || now,
    images: note.images || [], // 数组存放关联图片对象或ID
    tags: note.tags || [],
    isPinned: !!note.isPinned,
  };
  await db.put('notes', record);
  return record;
}

export async function deleteNote(id) {
  const db = await getDB();
  // 同时删除关联的独立图片记录
  const tx = db.transaction(['notes', 'images'], 'readwrite');
  const noteStore = tx.objectStore('notes');
  const imageStore = tx.objectStore('images');
  
  const note = await noteStore.get(id);
  if (note && note.images) {
    for (const img of note.images) {
      if (img.id) {
        await imageStore.delete(img.id);
      }
    }
  }
  await noteStore.delete(id);
  await tx.done;
}

// 图片存储操作
export async function saveImageRecord(imageRecord) {
  const db = await getDB();
  await db.put('images', imageRecord);
  return imageRecord;
}

export async function getImageRecord(id) {
  const db = await getDB();
  return await db.get('images', id);
}

export async function deleteImageRecord(id) {
  const db = await getDB();
  await db.delete('images', id);
}

// 清空所有本地数据
export async function clearAllLocalData() {
  const db = await getDB();
  const tx = db.transaction(['notes', 'images'], 'readwrite');
  await tx.objectStore('notes').clear();
  await tx.objectStore('images').clear();
  await tx.done;
}

// 获取存储概况（数据量统计）
export async function getStorageStats() {
  const db = await getDB();
  const notes = await db.getAll('notes');
  let imageCount = 0;
  let totalEstimatedBytes = 0;

  for (const n of notes) {
    if (n.images && Array.isArray(n.images)) {
      imageCount += n.images.length;
      for (const img of n.images) {
        if (img.data) {
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
