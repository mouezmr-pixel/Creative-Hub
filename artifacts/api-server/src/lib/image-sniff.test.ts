import { describe, it, expect } from "vitest";
import { sniffImageType, extensionForSniffedType } from "./image-sniff";

describe("sniffImageType", () => {
  it("detects a real PNG by its magic bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageType(png)).toBe("png");
  });

  it("detects a real JPEG by its magic bytes", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffImageType(jpeg)).toBe("jpeg");
  });

  it("detects a real GIF by its magic bytes", () => {
    const gif = Buffer.from("GIF89a" + "\0\0\0\0\0\0", "binary");
    expect(sniffImageType(gif)).toBe("gif");
  });

  it("detects a real WEBP by its magic bytes", () => {
    const webp = Buffer.concat([
      Buffer.from("RIFF", "ascii"),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from("WEBP", "ascii"),
    ]);
    expect(sniffImageType(webp)).toBe("webp");
  });

  it("returns null for plain text bytes pretending to be an image", () => {
    const fake = Buffer.from("this is not an image, just plain text bytes");
    expect(sniffImageType(fake)).toBeNull();
  });

  it("returns null for a buffer too short to contain any valid header", () => {
    expect(sniffImageType(Buffer.from([1, 2, 3]))).toBeNull();
  });
});

describe("extensionForSniffedType", () => {
  it("maps jpeg to the .jpg extension", () => {
    expect(extensionForSniffedType("jpeg")).toBe("jpg");
  });

  it("maps png/gif/webp to themselves", () => {
    expect(extensionForSniffedType("png")).toBe("png");
    expect(extensionForSniffedType("gif")).toBe("gif");
    expect(extensionForSniffedType("webp")).toBe("webp");
  });

  it("returns null for an undetected type", () => {
    expect(extensionForSniffedType(null)).toBeNull();
  });
});
