"use strict";
import fs, { type PathLike } from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { saveFolder, tempFolder, plugins } from '../config.json';

let initialized = false;

export function init() {
  if (initialized) { return this; }

  const essentialFolders = [
    getSaveLocation(),
    getTempLocation(),
    ...getPluginLocation(),
  ].filter(v => v !== undefined);
  for (const folder of essentialFolders) {
    if (fs.existsSync(folder)) { continue; }

    const folderPath = fs.mkdirSync(folder, { recursive: true });
    console.log(`Directory created successfully! : ${folderPath}`);
  }

  initialized = true;

  return this;
}

function getKeyValuePairFromLines(lines: string) {
  const output = new Map<string, string>();

  for (const line of lines.split("\r\n")) {
    if (line === "") { continue; }
    const [key, ...value] = line.split(":");
    output.set(key.trim(), value.join(":").trim());
  }

  return output;
}

function getPathFromShortcutLink(pathLink: PathLike) {
  if (process.platform === "win32") {
    const text = `"(New-Object -COM WScript.Shell).CreateShortcut('${pathLink}')"`;
    const stats = execSync(`powershell.exe -command ${text}`, { encoding: "utf-8" });

    return getKeyValuePairFromLines(stats).get("TargetPath");
  }

  if (process.platform === "darwin") {
    console.log(new Error("Shortcut for MacOS is not supported"));
    return;
  }

  console.log(new Error("Shortcuts for Unix/Linux is not supported"));
}

export function getFileCount() {
  try {
    const dirPath = getSaveLocation();
    if (!dirPath) { return; }
    if (!fs.statSync(dirPath).isDirectory()) { return; }

    const temp = new Map();
    const info = { count: 0, duplicateCount: 0 };

    for (let file of fs.readdirSync(dirPath)) {
      const userSaveBase = path.basename(file, path.extname(file));

      if (temp.has(userSaveBase)) {
        info.duplicateCount++;
        continue;
      }
      temp.set(userSaveBase, 1);
      info.count++;
    }
    return info;
  }
  catch (e) {
    console.log(e);
  }
}

function getPluginLocation() {
  return Object.values(plugins).map(v => path.join(__dirname, "../", v.path));
}

export function getSaveLocation() { return getLocation(saveFolder); }
export function getTempLocation() { return getLocation(tempFolder); }

function getLocation(locationPath: PathLike) {
  const isNotValidExt = (ext: string) => { return !!ext || ext === ".lnk" };

  const savePath = path.normalize(path.resolve(__dirname, locationPath.toString()));

  try { fs.statSync(savePath).isDirectory(); }
  catch (e) {
    const userSaveExt = path.extname(savePath);
    const userSaveBase = path.basename(savePath, userSaveExt);

    if (isNotValidExt(userSaveExt)) { return; }

    for (const item of fs.readdirSync(path.dirname(savePath))) {
      if (!path.extname(item) || path.extname(item) !== ".lnk") { continue; }

      const folderName = path.basename(item, path.extname(item));
      if (folderName !== userSaveBase) { continue; }

      return getPathFromShortcutLink(path.join(__dirname, "../", item));
    }
  }

  return savePath;
}

export function validQueries(username, userId, videoData, optional_id) {
  // if "optional_id" = true. "videoData" must be a string.
  // optional_id for searching.
  if (optional_id) {
    if (!username || !userId || !videoData) {
      return { error: true, comment: "Incorrect Request" };
    }
    return { error: false, comment: null };
  }

  if (!videoData) {
    return { error: true, comment: `Missing metadata: ${videoData}` };
  }

  if (typeof videoData === "string") {
    return { error: true, comment: "Incorrect Request" };
  }

  if (videoData.type === "playlist") {
    return { error: false, comment: null };
  }

  let haveSongId = videoData.id ?? videoData.every((current) => {
    return typeof current.id === "string";
  });

  if (!username || !userId || !haveSongId) {
    return { error: true, comment: "Incorrect Request" };
  }

  return { error: false, comment: null };
}