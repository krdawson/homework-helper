
/**
 * Resizes an image ensuring it doesn't exceed max dimensions while maintaining aspect ratio.
 */
export async function resizeImage(
  source: HTMLImageElement | HTMLVideoElement,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<{ dataUrl: string; base64: string }> {
  let width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  let height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

  // Calculate new dimensions maintaining aspect ratio
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.floor(width * ratio);
    height = Math.floor(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(source, 0, 0, width, height);
  
  // Use JPEG with 85% quality for good balance of size and quality
  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  const base64 = dataUrl.split(',')[1];

  return { dataUrl, base64 };
}

/**
 * Loads a File object into an HTMLImageElement
 */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
