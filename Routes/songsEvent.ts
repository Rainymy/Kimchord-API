"use strict";

import { RouteModule } from "../types/routeModule";

import path from 'node:path';

import { PRESETS } from '../Components/permission.js';
import { startDownload } from '../Components/download.js';
import { getSaveLocation, getTempLocation } from '../Components/util.js';

import Fastforward from 'kimchord-fastforward';

async function songsStream(req, res, GLOBAL_OBJECTS) {
  const { videoData } = req.body;
  const { fileManager } = GLOBAL_OBJECTS;

  if (videoData.isLive) {
    const callback = (result) => { if (result.error) { return console.log(result) } }
    const liveStream = await fileManager.liveStream(videoData, callback);

    return liveStream.pipe(res);
  }

  if (!videoData.isFile) {
    console.log("[isFile] Video Meta: ", videoData);
    const data = await startDownload(videoData, GLOBAL_OBJECTS);

    if (data?.error) {
      return res.send({ error: true, comment: data.comment });
    }
    if (data instanceof Error) {
      console.log(data);
      return res.send({ error: true, comment: "INTERNAL ERROR" });
    }

    const queue = fileManager.modQueue.get(videoData.id);
    return queue.stream.pipe(res);
  }

  if (videoData.streamModification.isSkipping) {
    const fast = new Fastforward();

    const skipToTime = Math.floor(videoData.streamModification.skip);
    if (videoData.duration <= skipToTime) {
      return res.send({
        error: true, comment: "audio duration is short than skip time"
      });
    }

    let skipTime: number = skipToTime;
    if (videoData.streamModification.isSkipRelative) {
      skipTime = Math.floor((Date.now() - videoData.time.start) / 1000);
    }

    fast.setSkipTo(skipTime);

    const fileInfo = fileManager.getFileInfoById(videoData.id)[0];

    const outputFile = `${fileInfo.name}-${skipTime}.mp3`;
    fast.setFileName(`${fileInfo.file}`);
    fast.setOutFileName(outputFile);

    fast.setInputFolder(getSaveLocation());
    fast.setOutputFolder(getTempLocation());

    fast.setDefaultConfig();

    console.log("-------------------------".repeat(2));
    const fast_res = await fast.run();
    console.log("-------------------------".repeat(2));
    console.log(fast_res);
    console.log("-------------------------".repeat(2));

    const readOutputFile = path.join(getTempLocation(), outputFile);
    const streamFile = await fileManager.readFile(readOutputFile);

    if (streamFile.error) {
      return res.send({ error: true, comment: streamFile.comment });
    }

    if (typeof streamFile.read === "function") {
      return streamFile.pipe(res);
    }

    res.set('content-type', 'audio/mp4');
    res.send(streamFile);

    return;
  }

  const streamFile = await fileManager.read(videoData);

  if (streamFile.error) {
    return res.send({ error: true, comment: streamFile.comment });
  }

  if (typeof streamFile.read === "function") {
    return streamFile.pipe(res);
  }

  res.set('content-type', 'audio/mp4');
  res.send(streamFile);

  return;
}

const mod: RouteModule = {
  method: "post",
  route: "/songs",
  skipLoad: false,
  permissions: [
    PRESETS.PERMISSIONS.QUERY
  ],
  main: songsStream
}

export default mod;