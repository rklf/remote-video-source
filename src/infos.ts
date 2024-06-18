import { fileTypeFromBlob } from "file-type";
import { toBlob } from "https://deno.land/std@0.224.0/streams/mod.ts";
import { ffprobe } from "https://deno.land/x/fast_forward/ffprobe.ts";
import probe from "probe-image-size";
import ytdl from "ytdl-core";
import fetch_url_info from "./fetch_url_info.ts";

export default async (req: Request) => {
  const urlParams = new URL(req.url).searchParams;
  const raw = urlParams.get("url");
  if (!raw) throw new Error("[MISSING] URL");
  console.warn("decode:", decodeURIComponent(raw));

  const url = await ytdl
    .getInfo(decodeURIComponent(raw))
    .then(({ formats }) => formats)
    .then((arr) =>
      arr
        .filter(({ hasVideo, hasAudio }) => hasVideo && hasAudio)
        .sort(({ bitrate: a }, { bitrate: b }) => b - a)
        .shift()
    )
    .then((video) => (video ? video.url : raw))
    .catch((d) => d && raw);

  const { fileSize, contentType } = await fetch_url_info(url);

  let mime: string | undefined = contentType;
  if (!contentType) {
    const blobBody = await fetch(url).then((res) => toBlob(res.body));
    mime = (await fileTypeFromBlob(blobBody))?.mime;
  }

  return new Response(
    JSON.stringify({
      ...(mime?.includes("image")
        ? await probe(url).then((
          { width, height }: { width: number; height: number },
        ) => ({
          width,
          height,
          size: fileSize,
        }))
        : await new Promise((res, rej) =>
          ffprobe(url, {}).then(({
            format: { size },
            streams: [{ width, height, duration }],
          }) => res({ width, height, duration, size })).catch(rej),
        )),
      contentType: mime,
      name: url.split("/").pop()?.split(".")?.shift(),
      url,
    }),
  );
};
