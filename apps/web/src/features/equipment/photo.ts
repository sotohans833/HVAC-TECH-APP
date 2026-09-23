/**
 * Phone cameras take 12–48 MP photos. A nameplate reads just as well at the
 * size Claude's vision works at natively, and a tenth of the bytes matters when
 * the upload is going out over one bar of LTE from a crawlspace.
 */
const MAX_EDGE = 1568;
const QUALITY = 0.85;

export async function downscalePhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    return blob ?? file;
  } finally {
    bitmap.close();
  }
}

/** The base64 body of a blob, without the `data:...;base64,` prefix. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read photo'));
    reader.readAsDataURL(blob);
  });
}
