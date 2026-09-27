// Browser-only helpers for preparing photos before upload.

export async function readTakenAt(file: File): Promise<Date | null> {
  const exifr = (await import("exifr")).default;
  try {
    const tags = await exifr.parse(file, ["DateTimeOriginal", "CreateDate"]);
    const d = tags?.DateTimeOriginal ?? tags?.CreateDate;
    return d instanceof Date && !isNaN(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

const isHeic = (f: File) => /\.hei[cf]$/i.test(f.name) || /image\/hei[cf]/.test(f.type);

// Decode (converting HEIC first), then return a full-size and a thumbnail JPEG.
export async function toJpegs(file: File) {
  let blob: Blob = file;
  if (isHeic(file)) {
    const heic2any = (await import("heic2any")).default;
    const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    blob = Array.isArray(out) ? out[0] : out;
  }
  const bitmap = await createImageBitmap(blob);
  const render = (max: number, quality: number) => {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return new Promise<{ blob: Blob; width: number; height: number }>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve({ blob: b, width: canvas.width, height: canvas.height }) : reject(new Error("encode failed"))), "image/jpeg", quality),
    );
  };
  const [full, thumb] = [await render(2400, 0.85), await render(600, 0.8)];
  bitmap.close();
  return { full, thumb };
}
