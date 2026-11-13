/**
 * Mengompres gambar JPEG/PNG/WEBP di sisi browser menggunakan Canvas API
 * apabila ukuran file melebihi batas maxSizeMB yang diizinkan formulir.
 */
export async function compressImageIfNeeded(
  file: File,
  maxSizeMB: number
): Promise<{ file: File; compressed: boolean }> {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size <= maxBytes || !file.type.startsWith('image/')) {
    return { file, compressed: false };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const maxDim = 1800;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ file, compressed: false });
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) {
            resolve({ file, compressed: false });
            return;
          }
          const safeName = file.name.replace(/\.[^.]+$/, '.jpg');
          const compressedFile = new File([blob], safeName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve({ file: compressedFile, compressed: true });
        },
        'image/jpeg',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ file, compressed: false });
    };

    img.src = objectUrl;
  });
}

