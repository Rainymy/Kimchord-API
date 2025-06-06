"use strict";
import path from 'node:path';

import { logDownload } from './logDownload.js';
import { makeWriteStream, makeDLPStream, makeReadStream, deleteFile, checkFileExists, parseLocalFolder } from "./handleFile.js";

import Cookies from './Cookies.js';
import YT_DLP from '../API/ytDLPHandler.js';

const MINUTE_ms = 1000 * 60;
const timeoutTimer = MINUTE_ms * 5;

function cancelDownload(stream) {
  console.log("cancelDownload", stream);
  const customError = new Error("Download timeout");
  customError.myError = true;
  customError.info = {
    message: `Cancelling download: Idle timer reached ${timeoutTimer}ms`
  }

  return stream.emit("error", customError);
}

function logDownloadAmount(stream, video) {
  let dataLength = 0;
  let metadataLength = 0;

  stream.on("data", (chunk) => { dataLength += chunk.length; });
  stream.on("fileSize", (size) => { metadataLength = size; });

  stream.on("finish", () => { logDownload(video, metadataLength, dataLength); });
}

export function File_Manager() {
  this.queue = new Map(); // currently downloading
  this.modQueue = {
    get: (id) => { return this.queue.get(id); },
    exists: (id) => { return this.queue.has(id); },
    append: (id, stream) => { return this.queue.set(id, stream); },
    remove: (id) => { return this.queue.delete(id); }
  }
  this.cache; // parse folder files
  this.modCache = {
    get: (id) => { return this.cache.get(id); },
    has: (id) => { return this.cache.has(id); },
    append: (video) => {
      const newEntry = this.createDescriptor(video.id, video.container);

      console.log("Stuck: ", [...this.queue]); // <debugging purpose>

      // create if doesn't exist
      if (!this.modCache.has(video.id)) {
        return this.cache.set(video.id, [newEntry]);
      }

      // add if other version exist
      const saved = this.modCache.get(video.id);
      const notExists = saved.every((cur) => cur.container !== video.container);
      if (notExists) { saved.push(newEntry); }

      return;
    },
    remove: (id) => {
      const saved = this.modCache.get(id);

      if (saved && saved.length > 1) { return saved.shift(); }
      return this.cache.delete(id);
    }
  }

  this.cookies;

  this.init = async (baseFolder) => {
    this.baseFolder = baseFolder;
    this.cache = parseLocalFolder(this.baseFolder);
    this.cookies = await Cookies.get();

    this.YT_DLP = await YT_DLP.init();
    this.YT_DLP.setCookie(Cookies.netscapeCookiePath);

    return this;
  }

  this.getFileInfoById = (id) => this.modCache.get(id);

  this.saveLocation = (video) => {
    if (!this.modCache.has(video.id)) {
      return path.join(this.baseFolder, `./${video.id}.${video.container}`);
    }
    const ext = this.modCache.get(video.id)[0].file;
    if (typeof ext === "undefined") { console.log("WARNING NO FILE EXTENSION"); }

    return path.join(this.baseFolder, `./${ext}`);
  }

  this.checkFileExists = async (filePath) => await checkFileExists(filePath);

  this.createDescriptor = (name, container) => {
    return { name: name, file: `${name}.${container}`, container: container }
  }

  this.readFile = async (filePath) => {
    return await makeReadStream(filePath);
  }
  this.read = async (video) => {
    return await makeReadStream(this.saveLocation(video));
  }

  this.delete = async (video) => {
    const filePath = this.saveLocation(video);

    const err = await deleteFile(filePath);
    if (err) { return { error: true, comment: err }; }

    this.modCache.remove(video.id);

    return { error: false, comment: null };
  }

  this.download = async (video) => {
    let timeoutID: NodeJS.Timeout;
    const cb = (result) => {
      clearTimeout(timeoutID);

      this.modQueue.remove(video.id);

      if (!result.error) { this.modCache.append(video); }
      else { this.modCache.remove(video.id); }
    }

    if (this.modQueue.exists(video.id)) {
      const { stream } = this.modQueue.get(video.id);
      stream.on("existing_stream", cb);

      console.log("Duplicated request stream: ", video.title);
      return [null, stream];
    }

    const streamURL = await makeDLPStream(video, cb);
    if (streamURL.error) { return []; }

    const filePath = this.saveLocation(video);
    const streamToFile = await makeWriteStream(filePath);

    logDownloadAmount(streamURL, video);

    const data = {
      id: video.id,
      title: video.title,
      url: video.url,
      requestedTime: video.requestedTime,
      stream: streamURL
    }

    timeoutID = setTimeout(cancelDownload, timeoutTimer, streamURL);
    this.modQueue.append(video.id, data);

    streamURL.on("data", () => { streamURL.emit("ready-to-read"); });
    streamURL.pipe(streamToFile);

    return [streamURL, streamToFile];
  }

  this.liveStream = async (video, callback) => {
    return await makeDLPStream(video, callback);
  }

  return this;
}