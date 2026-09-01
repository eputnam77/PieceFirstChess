/**
 * Multi-frame zstd decompression.
 *
 * The Lichess puzzle archive is not one zstd frame — it is a concatenation of
 * dozens of them, with a skippable frame at the front. Node's
 * `createZstdDecompress()` decodes the first frame and then rejects the next
 * frame's magic number with "Unknown frame descriptor", so piping the download
 * straight into it silently yields only the opening slice of the database
 * (about 180k of 5M puzzles — enough to look like it worked).
 *
 * There is no Node option for "keep reading across frames", so the frame
 * boundaries are found here by walking the zstd frame format, and each frame is
 * handed to the decompressor on its own. Skippable frames are dropped.
 *
 * Format reference: RFC 8878 §3.1.1 (Zstandard frames) and §3.1.2 (skippable
 * frames).
 */

import { Buffer } from "node:buffer";
import { Transform } from "node:stream";
import { zstdDecompressSync } from "node:zlib";

const ZSTD_MAGIC = 0xfd2fb528;
const SKIPPABLE_MIN = 0x184d2a50;
const SKIPPABLE_MAX = 0x184d2a5f;

/** Byte width of the Dictionary_ID field, indexed by its 2-bit flag. */
const DID_SIZES = [0, 1, 2, 4];
/** Byte width of the Frame_Content_Size field, indexed by its 2-bit flag. */
const FCS_SIZES = [0, 2, 4, 8];

const NEED_MORE = -1;

/**
 * Total byte length of the frame starting at `offset`.
 * @param {Buffer} buffer accumulated compressed bytes
 * @param {number} offset index the frame starts at
 * @returns {number} frame length, or NEED_MORE when the buffer is short
 * @throws {Error} when the bytes are not a zstd or skippable frame
 */
export const frameLength = (buffer, offset = 0) => {
  if (buffer.length - offset < 4) return NEED_MORE;
  const magic = buffer.readUInt32LE(offset);

  if (magic >= SKIPPABLE_MIN && magic <= SKIPPABLE_MAX) {
    if (buffer.length - offset < 8) return NEED_MORE;
    return 8 + buffer.readUInt32LE(offset + 4);
  }

  if (magic !== ZSTD_MAGIC) {
    throw new Error(
      `not a zstd frame at byte ${offset}: magic 0x${magic.toString(16)}`,
    );
  }

  let position = offset + 4;
  if (buffer.length <= position) return NEED_MORE;

  const descriptor = buffer[position];
  position += 1;

  const contentSizeFlag = descriptor >> 6;
  const singleSegment = (descriptor >> 5) & 1;
  const hasChecksum = (descriptor >> 2) & 1;
  const dictionaryIdFlag = descriptor & 3;

  // The Window_Descriptor byte is omitted for single-segment frames.
  if (!singleSegment) position += 1;
  position += DID_SIZES[dictionaryIdFlag];
  // A zero flag means one byte for single-segment frames, and no field at all
  // otherwise — the one case where the lookup table does not apply.
  position +=
    contentSizeFlag === 0 ? singleSegment : FCS_SIZES[contentSizeFlag];

  // Walk the block sequence; each block header states its own size.
  for (;;) {
    if (buffer.length - position < 3) return NEED_MORE;
    const header =
      buffer[position] |
      (buffer[position + 1] << 8) |
      (buffer[position + 2] << 16);
    position += 3;

    const isLastBlock = header & 1;
    const blockType = (header >> 1) & 3;
    const blockSize = header >> 3;

    if (blockType === 3) {
      throw new Error(`reserved zstd block type at byte ${position - 3}`);
    }
    // An RLE block carries a single byte that is repeated Block_Size times.
    position += blockType === 1 ? 1 : blockSize;

    if (isLastBlock) break;
  }

  if (hasChecksum) position += 4;
  if (buffer.length < position) return NEED_MORE;
  return position - offset;
};

/**
 * A stream transform that decompresses a concatenation of zstd frames.
 *
 * Frames are buffered whole, so peak memory is one compressed frame plus its
 * decompressed output. The Lichess archive uses roughly 9 MB frames.
 * @returns {Transform} compressed bytes in, decompressed bytes out
 */
export const createMultiFrameZstdDecompress = () => {
  let pending = Buffer.alloc(0);

  /**
   * Emit every whole frame currently buffered.
   * @param {Transform} stream the transform to push into
   */
  const drain = (stream) => {
    for (;;) {
      const length = frameLength(pending, 0);
      if (length === NEED_MORE || pending.length < length) return;

      const frame = pending.subarray(0, length);
      pending = pending.subarray(length);

      const magic = frame.readUInt32LE(0);
      if (magic >= SKIPPABLE_MIN && magic <= SKIPPABLE_MAX) continue;
      stream.push(zstdDecompressSync(frame));
    }
  };

  return new Transform({
    transform(chunk, _encoding, callback) {
      pending = Buffer.concat([pending, chunk]);
      try {
        drain(this);
      } catch (error) {
        return callback(error);
      }
      return callback();
    },
    flush(callback) {
      // A truncated tail is normal when the scan stopped early and the socket
      // was torn down mid-frame; there is nothing useful left to emit.
      callback();
    },
  });
};
