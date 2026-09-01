import { Buffer } from "node:buffer";
import { zstdCompressSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { createMultiFrameZstdDecompress, frameLength } from "./zstd-frames.js";

/** Build a zstd skippable frame carrying `payload`. */
const skippableFrame = (payload) => {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(0x184d2a50, 0);
  header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([header, payload]);
};

/** Run a buffer through the transform and collect everything it emits. */
const decompress = (input, chunkSize = input.length) =>
  new Promise((resolve, reject) => {
    const stream = createMultiFrameZstdDecompress();
    const out = [];
    stream.on("data", (chunk) => out.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(out)));
    for (let at = 0; at < input.length; at += chunkSize) {
      stream.write(input.subarray(at, at + chunkSize));
    }
    stream.end();
  });

describe("frameLength", () => {
  it("measures a skippable frame including its payload", () => {
    const frame = skippableFrame(Buffer.from("0123456789"));
    expect(frameLength(frame)).toBe(18);
  });

  it("measures a compressed frame exactly", () => {
    const frame = zstdCompressSync(Buffer.from("hello zstd".repeat(50)));
    expect(frameLength(frame)).toBe(frame.length);
  });

  it("asks for more data rather than guessing", () => {
    const frame = zstdCompressSync(Buffer.from("hello zstd".repeat(50)));
    expect(frameLength(frame.subarray(0, 3))).toBe(-1);
    expect(frameLength(frame.subarray(0, frame.length - 1))).toBe(-1);
  });

  it("rejects bytes that are not a frame", () => {
    expect(() => frameLength(Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(
      /not a zstd frame/,
    );
  });
});

describe("createMultiFrameZstdDecompress", () => {
  it("reads across concatenated frames", async () => {
    const first = zstdCompressSync(Buffer.from("first frame\n"));
    const second = zstdCompressSync(Buffer.from("second frame\n"));
    const third = zstdCompressSync(Buffer.from("third frame\n"));

    const out = await decompress(Buffer.concat([first, second, third]));
    expect(out.toString()).toBe("first frame\nsecond frame\nthird frame\n");
  });

  it("drops a leading skippable frame", async () => {
    const input = Buffer.concat([
      skippableFrame(Buffer.from("metadata")),
      zstdCompressSync(Buffer.from("payload")),
    ]);
    expect((await decompress(input)).toString()).toBe("payload");
  });

  it("does not care where the chunk boundaries fall", async () => {
    const input = Buffer.concat([
      skippableFrame(Buffer.from("m")),
      zstdCompressSync(Buffer.from("alpha")),
      zstdCompressSync(Buffer.from("beta")),
    ]);
    // One byte at a time is the worst case: every frame arrives in fragments.
    expect((await decompress(input, 1)).toString()).toBe("alphabeta");
  });
});
