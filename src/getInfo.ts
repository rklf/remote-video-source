import { FileInfo } from "./types.ts";
import { dataView, memory, wasi, wasmFunctions } from "./common.ts";
import { utf8Encode } from "./wasmUtil.ts";
import { memPointerToString } from "./wasmUtil.ts";

export const getInfo = async (
    input: unknown,
): Promise<
    { result: "ok"; fileInfo: FileInfo } | { result: "err"; error: string }
> => {
    if (typeof input === "string") {
        try {
            input = new URL(input);
        } catch {
            return { result: "err", error: "Invalid input: not URL" };
        }
    }

    let filename = "/tmpvideo";
    let buf: Uint8Array;
    if (input instanceof URL) {
        filename = `/${input.pathname.split("/").slice(-1)[0]}`;
        if (!filename) {
            return { result: "err", error: "Invalid input: not video" };
        }
        const res = await fetch(input);
        if (!res.ok || !res.headers.get("Content-Type")?.includes("video")) {
            res.body?.cancel();

            return { result: "err", error: "Invalid input: not video" };
        }

        buf = new Uint8Array(await res.arrayBuffer());
    } else if (input instanceof File || input instanceof Blob) {
        filename = input instanceof File ? `/${input.name}` : filename;
        buf = new Uint8Array(await input.arrayBuffer());
    } else if (input instanceof Uint8Array) {
        buf = input;
    } else if (input instanceof ArrayBuffer) {
        buf = new Uint8Array(input);
    } else if (
        input instanceof Object && "buffer" in input &&
        input.buffer instanceof ArrayBuffer
    ) {
        buf = new Uint8Array(input.buffer);
    } else {
        return { result: "err", error: "Invalid input" };
    }

    const file = wasi.fs.open(filename, {
        read: true,
        write: true,
        create: true,
    });
    file.write(buf);
    file.seek(0);

    const { ptr, len } = utf8Encode(filename);

    const ret = wasmFunctions.getInfo(ptr, len);
    const postReturn = wasmFunctions.CABIPostGetInfo;
    const result = dataView(memory).getInt32(ret + 0, true);
    if (result !== 0) {
        const error = memPointerToString(ret + 4);
        postReturn(ret);

        return { result: "err", error };
    }
    const info: FileInfo = {
        name: memPointerToString(ret + 4),
        bitRate: dataView(memory).getFloat32(ret + 12, true),
        duration: dataView(memory).getFloat32(ret + 16, true),
        size: buf.byteLength,
        url: memPointerToString(ret + 20),
        nbStreams: dataView(memory).getInt32(ret + 28, true),
        flags: dataView(memory).getInt32(ret + 32, true),
        nbChapters: dataView(memory).getInt32(ret + 36, true),
        streams: ((streamsBasePtr: number) => {
            const streamsPtr = dataView(memory).getInt32(streamsBasePtr, true);
            const streamsLen = dataView(memory).getInt32(streamsBasePtr + 4, true);

            return new Array(streamsLen).fill(0).map((_, i) => {
                const basePtr = streamsPtr + i * 76;

                return {
                    id: dataView(memory).getInt32(basePtr, true),
                    startTime: dataView(memory).getFloat32(basePtr + 4, true),
                    duration: dataView(memory).getFloat32(basePtr + 8, true),
                    codecType: dataView(memory).getInt32(basePtr + 12, true),
                    codecName: memPointerToString(basePtr + 16),
                    format: memPointerToString(basePtr + 24),
                    bitRate: dataView(memory).getFloat32(basePtr + 32, true),
                    profile: memPointerToString(basePtr + 36),
                    level: dataView(memory).getInt32(basePtr + 44, true),
                    width: dataView(memory).getInt32(basePtr + 48, true),
                    height: dataView(memory).getInt32(basePtr + 52, true),
                    channels: dataView(memory).getInt32(basePtr + 56, true),
                    sampleRate: dataView(memory).getInt32(basePtr + 60, true),
                    frameSize: dataView(memory).getInt32(basePtr + 64, true),
                    tags: ((tagsBasePtr: number) => {
                        const tagsPtr = dataView(memory).getInt32(tagsBasePtr, true);
                        const tagsLen = dataView(memory).getInt32(tagsBasePtr + 4, true);

                        return new Array(tagsLen).fill(0).map((_, i) => {
                            const basePtr = tagsPtr + i * 16;
                            console.log(new Uint8Array(memory.buffer, basePtr, 16));

                            return {
                                key: memPointerToString(basePtr),
                                value: memPointerToString(basePtr + 8),
                            };
                        });
                    })(basePtr + 68),
                };
            });
        })(ret + 40),
    };
    postReturn(ret);

    return { result: "ok", fileInfo: info };
};
