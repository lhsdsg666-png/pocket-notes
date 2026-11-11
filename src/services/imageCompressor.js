/**
 * 手机端图片自动压缩与处理工具
 * 将手机拍摄的 5MB~20MB 超大原图压缩为高清且体积仅 ~150KB~350KB 的 WebP/JPEG 格式
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    // 检查是否为图片文件
    if (!file.type.startsWith('image/')) {
      return reject(new Error('请选择有效的图片文件'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('加载图片失败'));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // 计算等比例缩放尺寸
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // 平滑渲染
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 绘制图片到画布
        ctx.drawImage(img, 0, 0, width, height);

        // 优先使用 webp，如果浏览器不支持则自动回退到 jpeg
        let outputType = mimeType;
        let compressedDataUrl = canvas.toDataURL(outputType, quality);
        if (!compressedDataUrl.startsWith(`data:${outputType}`)) {
          outputType = 'image/jpeg';
          compressedDataUrl = canvas.toDataURL(outputType, quality);
        }

        // 计算生成缩略图（用于列表极速渲染）
        let thumbDataUrl = '';
        try {
          const thumbCanvas = document.createElement('canvas');
          const thumbMax = 240;
          let tw = width;
          let th = height;
          if (tw > th) {
            th = Math.round((th * thumbMax) / tw);
            tw = thumbMax;
          } else {
            tw = Math.round((tw * thumbMax) / th);
            th = thumbMax;
          }
          thumbCanvas.width = tw;
          thumbCanvas.height = th;
          const thumbCtx = thumbCanvas.getContext('2d');
          thumbCtx.imageSmoothingEnabled = true;
          thumbCtx.drawImage(canvas, 0, 0, tw, th);
          thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);
        } catch {
          thumbDataUrl = compressedDataUrl;
        }

        const approxSize = Math.round((compressedDataUrl.length * 3) / 4);

        resolve({
          id: 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
          name: file.name || 'photo.jpg',
          type: outputType,
          width,
          height,
          size: approxSize,
          data: compressedDataUrl, // 完整高清压缩图
          thumbnail: thumbDataUrl, // 列表小图
          createdAt: new Date().toISOString()
        });
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * 批量压缩文件列表
 */
export async function compressImages(files, onProgress) {
  const results = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress(i + 1, total, file.name);
    }
    try {
      const compressed = await compressImage(file);
      results.push(compressed);
    } catch (err) {
      console.error('压缩图片失败:', file.name, err);
    }
  }

  return results;
}
