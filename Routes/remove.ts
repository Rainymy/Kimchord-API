"use strict";
import { PRESETS } from '../Components/permission';

import type { RouteModule } from "../types/routeModule";

async function remove(req, res, GLOBAL_OBJECTS) {
  const { videoData } = req.body;
  const video = videoData[0];

  const result = await GLOBAL_OBJECTS.fileManager.delete(video);
  if (result.error) {
    return res.send({ error: true, comment: result.comment });
  }

  return res.send({ error: false, comment: `Deleted: ${video.title}` });
}

const mod: RouteModule = {
  method: "post",
  route: "/remove",
  skipLoad: false,
  permissions: [PRESETS.PERMISSIONS.QUERY],
  main: remove
}
export default mod;