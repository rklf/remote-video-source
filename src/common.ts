import {
    init as initWASI,
    WASI,
  } from "https://deno.land/x/wasm@v1.2.2/wasi.ts";
  
  await initWASI();
  export const wasi = new WASI({});
  const byte = await fetch(new URL("../built/ffprobe.wasm", import.meta.url))
    .then(
      (res) => res.arrayBuffer(),
    );
  const module = await WebAssembly.compile(byte);
  const mem = new WebAssembly.Memory({ initial: 1000, maximum: 65536 });
  const instance = wasi.instantiate(module, {
    memory: mem,
  });
  
  let dv = new DataView(new ArrayBuffer(0));
  export const dataView = (mem: WebAssembly.Memory) =>
    dv.buffer === mem.buffer ? dv : dv = new DataView(mem.buffer);
  export const realloc = instance.exports.cabi_realloc as (
    ptr: number,
    old_size: number,
    align: number,
    new_size: number,
  ) => number;
  export const memory = instance.exports.memory as WebAssembly.Memory;
  
  export const wasmFunctions = {
    init: instance.exports.init as () => void,
  
    libavformatVersion: instance.exports["libavformat-version"] as () => number,
    CABIPostLibavformatVersion: instance
      .exports["cabi_post_libavformat-version"] as (arg: number) => void,
  
    libavcodecVersion: instance.exports["libavcodec-version"] as () => number,
    CABIPostLibavcodecVersion: instance
      .exports["cabi_post_libavcodec-version"] as (arg: number) => void,
  
    libavutilVersion: instance.exports["libavutil-version"] as () => number,
    CABIPostLibavutilVersion: instance.exports["cabi_post_libavutil-version"] as (
      arg: number,
    ) => void,
  
    getInfo: instance.exports["get-info"] as (ptr: number, len: number) => number,
    CABIPostGetInfo: instance.exports["cabi_post_get-info"] as (
      arg: number,
    ) => void,
  };