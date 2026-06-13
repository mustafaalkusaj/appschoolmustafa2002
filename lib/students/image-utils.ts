/**
 * Compresses a document image (ID, passport, certificate…) while preserving
 * its aspect ratio. Resizes the longest side to 1600px max, converts to WebP.
 * No cropping — the full document stays visible.
 */
export function compressDocumentImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX = 1600;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) {
          h = Math.round((h / w) * MAX);
          w = MAX;
        } else {
          w = Math.round((w / h) * MAX);
          h = MAX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/webp",
        0.85,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

/**
 * Center-crops a File to a square, resizes to 400×400, and converts to WebP.
 * Returns a Blob ready for upload. No dependencies — pure Canvas API.
 */
export function cropAndCompressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - size) / 2;
      const sy = (img.naturalHeight - size) / 2;

      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }

      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);

      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to compress image"));
        },
        "image/webp",
        0.82,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}
