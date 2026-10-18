import { HttpError } from "./security.js";
// Validate bounded dimensions without decompressing untrusted image bytes in Lambda.
export function validateImage(bytes: Buffer, mime: string) {
  let width = 0, height = 0;
  if (mime === "image/png" && bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString("ascii",12,16) === "IHDR") {
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
  } else if (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      if (marker === 255) { offset++; continue; }
      if (marker === 217 || marker === 218) break;
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ([192,193,194].includes(marker) && length >= 8) { height = bytes.readUInt16BE(offset + 5); width = bytes.readUInt16BE(offset + 7); break; }
      offset += length + 2;
    }
  }
  if (!width || !height || width > 1024 || height > 1024 || bytes.length > 500000) throw new HttpError(400, "Image must be JPEG/PNG, at most 1024 pixels per side and 500 KB");
}
