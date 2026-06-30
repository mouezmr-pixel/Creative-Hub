export type SniffedImageType = "png" | "jpeg" | "gif" | "webp" | null;

export function sniffImageType(buffer: Buffer): SniffedImageType {
  if (buffer.length < 12) return null;

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") {
    return "gif";
  }

  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export function extensionForSniffedType(type: SniffedImageType): string | null {
  if (!type) return null;
  return type === "jpeg" ? "jpg" : type;
}
