/**
 * 笔记本地备份与导出/恢复服务
 */
import { getAllNotes, saveNote } from '../db/indexedDB';

export async function exportNotesBackup() {
  const notes = await getAllNotes();
  const data = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    notesCount: notes.length,
    notes: notes,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = `PocketNotes_Backup_${dateStr}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { count: notes.length, filename };
}

export async function importNotesBackup(file, mode = 'merge') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取备份文件失败'));
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const json = JSON.parse(text);

        let incomingNotes = [];
        if (Array.isArray(json)) {
          incomingNotes = json;
        } else if (json && Array.isArray(json.notes)) {
          incomingNotes = json.notes;
        } else {
          return reject(new Error('备份文件格式不正确，缺少笔记数据'));
        }

        let importedCount = 0;
        for (const note of incomingNotes) {
          if (!note.id) {
            note.id = 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          }
          await saveNote(note);
          importedCount++;
        }

        resolve({ count: importedCount });
      } catch (err) {
        reject(new Error('解析备份文件失败: ' + err.message));
      }
    };
    reader.readAsText(file);
  });
}
