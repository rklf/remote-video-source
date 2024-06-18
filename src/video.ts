import ytdl from "ytdl-core";
import fetch_url_info from "./fetch_url_info.ts";

const videoCache: Record<
  string,
  { url: string; fileSize: number; contentType: string }
> = {};

export default async (req: Request) => {
  const urlParams = new URL(req.url).searchParams;
  const videoId = urlParams.get("video_id");
  const videoUrl = urlParams.get("url");
  const proxy = urlParams.get("proxy") === "true";
  if (!videoId && !videoUrl) return new Response("[MISSING] VIDEO_ID OR URL");

  const cacheKey = videoId || videoUrl || "";
  if (!videoCache[cacheKey]) {
    const url = await ytdl
      .getInfo(
        videoId ? `https://www.youtube.com/watch?v=${videoId}` : videoUrl ?? "",
      )
      .then(({ formats }) => formats)
      .then((arr) =>
        arr
          .filter(({ hasVideo, hasAudio }) => hasVideo && hasAudio)
          .sort(({ bitrate: a }, { bitrate: b }) => b - a)
          .shift()
      )
      .then((video) => (video ? video.url : null));

    if (!url) throw Error("[ERROR] URL");

    const { fileSize, contentType } = await fetch_url_info(url);
    videoCache[cacheKey] = { url, fileSize, contentType };
  }

  const { url, fileSize, contentType } = videoCache[cacheKey];

  if (proxy) {
    const rangeHeader = req.headers.get("range");
    let [start, end] = [0, fileSize - 1];

    if (rangeHeader) {
      const [, rangeStart, rangeEnd] =
        rangeHeader.match(/bytes=(\d+)-(\d+)?/) || [];
      start = parseInt(rangeStart, 10) || start;
      end = parseInt(rangeEnd, 10) || end;
    }

    if (start > end || start < 0 || end >= fileSize) {
      return new Response(null, { status: 416 });
    }

    const videoResponse = await fetch(url, {
      headers: { range: `bytes=${start}-${end}` },
    });

    return new Response(videoResponse.body, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": (end - start + 1).toString(),
        "Cache-Control": "no-cache",
      },
    });
  } else {
    return new Response(
      null,
      { status: 301, headers: { Location: url } },
    );
  }
};
