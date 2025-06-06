"use strict";

import { RouteModule } from "../types/routeModule";

import { PRESETS } from '../Components/permission.js';

async function getSongDurationOrDelete(video, filePath, GLOBAL_OBJECTS) {
  const { fileManager, youtube } = GLOBAL_OBJECTS;

  try { return await youtube.getVideoDurationInSeconds(filePath); }
  catch (e) {
    const err = fileManager.delete(video);
    if (err.error) { console.log(err); }
    else { console.log("Deleted unreadable file", filePath); }
  }
}

async function request(req, res, GLOBAL_OBJECTS) {
  const { videoData } = req.body;
  const { fileManager } = GLOBAL_OBJECTS;

  const songList = videoData.type === "playlist" ? videoData.playlist : videoData;

  for (let item of songList) {
    const filePath = fileManager.saveLocation(item);
    item.isFile = await fileManager.checkFileExists(filePath);

    if (item.isLive) { continue; }
    if (item.isFile) {
      item.duration = await getSongDurationOrDelete(item, filePath, GLOBAL_OBJECTS);
    }
    if (!item.duration) {
      const meta = await fileManager.YT_DLP.getMetadata(item.url);
      item.ext = meta.ext;
      item.isLive = meta.is_live;
      item.duration = meta.duration;
    }
  }

  return res.send(videoData);
}

const mod: RouteModule = {
  method: "post",
  route: "/request",
  skipLoad: false,
  permissions: [
    PRESETS.PERMISSIONS.QUERY
  ],
  main: request
}

export default mod;