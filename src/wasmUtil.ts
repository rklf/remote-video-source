import { dataView, memory, realloc } from "./common.ts";

export const utf8Decoder = new TextDecoder("utf-8");
export const utf8Encoder = new TextEncoder();
export const utf8Encode = (
  s: string,
): { ptr: number; len: number } => {
  if (s.length === 0) {
    return { ptr: 1, len: 0 };
  }
  let allocLen = 0;
  let ptr = 0;
  let writtenTotal = 0;
  while (s.length > 0) {
    ptr = realloc(ptr, allocLen, 1, allocLen += s.length * 2);
    const { read, written } = utf8Encoder.encodeInto(
      s,
      new Uint8Array(
        memory.buffer,
        ptr + writtenTotal,
        allocLen - writtenTotal,
      ),
    );
    writtenTotal += written;
    s = s.slice(read);
  }

  return { ptr, len: writtenTotal };
};

export const memPointerToString = (
  mamPtr: number,
) => {
  const ptr = dataView(memory).getInt32(mamPtr + 0, true);
  const len = dataView(memory).getInt32(mamPtr + 4, true);
  const result = utf8Decoder.decode(new Uint8Array(memory.buffer, ptr, len));

  return result;
};