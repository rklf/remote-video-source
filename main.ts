import { router } from "rutt";
import video from "./src/video.ts";
import infos from "./src/infos.ts";

await Deno.serve(
  { port: 8000 },
  router({
    "GET@/video{/}?": async (req) => {
      return await video(req);
    },
    "GET@/infos{/}?": async (req) => {
      return await infos(req);
    },
  }),
).finished;
