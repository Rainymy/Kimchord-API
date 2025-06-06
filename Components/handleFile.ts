import fs, { WriteStream, type PathLike } from 'node:fs';
import path from "node:path";

import DLP from '../API/ytDLPHandler.js';
import { Writable } from 'node:stream';

export function checkFileExists(filepath: PathLike) {
  return new Promise((resolve, reject) => {
    fs.access(filepath, fs.constants.F_OK, (error) => resolve(!error));
  });
}

function getFilesizeInBytes(filePath: PathLike) {
  return new Promise((resolve, reject) => {
    fs.stat(filePath, (error, stats) => resolve(stats?.size ?? 0));
  });
}

export function deleteFile(filePath: PathLike) {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => resolve(err))
  });
}

export function parseLocalFolder(baseFolder) {
  const accum = new Map();
  const localFiles = fs.readdirSync(baseFolder);

  for (let file of localFiles) {
    const extension = path.extname(file);
    const basename = path.basename(file, extension);

    if (!accum.has(basename)) { accum.set(basename, []); }

    const saved = accum.get(basename);
    saved.push({ name: basename, file: file, container: extension });
  }

  return accum;
}

export function makeReadStream(filePath: PathLike) {
  return new Promise((resolve, reject) => {
    const readFile = fs.createReadStream(filePath, { autoClose: true });

    readFile.on('error', (error) => {
      console.log("ERROR from makeReadStream: ", error);
      readFile.destroy();
      resolve({ error: true, comment: "Internal error!" });
    });

    readFile.on('close', () => { console.log('Read stream closed'); });
    readFile.on('finish', () => { console.log('Read stream Finished'); });

    return resolve(readFile);
  });
}

export function makeWriteStream(filePath: PathLike, flags?: {}): Promise<WriteStream> {
  return new Promise((resolve, reject) => {
    const streamToFile = fs.createWriteStream(filePath, flags ?? {});

    streamToFile.on("error", (error) => {
      streamToFile.close();

      console.log("Caught error in makeWriteStream: ", error);
    });

    streamToFile.on("close", async () => {
      if (await getFilesizeInBytes(filePath) !== 0) { return; }

      const err = await deleteFile(filePath);
      if (err) { return console.log("Encountered error <deleting>. ", err); }
    });

    resolve(streamToFile);
  });
}

type ReturnValue = {
  error: boolean | null,
  comment: string | null,
  video?: any
}
export async function makeDLPStream(video, cb = (value: ReturnValue) => { }) {
  const metadata = await DLP.getMetadata(video.url);
  const readableStream = DLP.createDownload(video.url, video.isLive);

  const finallyCallback = (returnValue: ReturnValue) => {
    readableStream.emit("existing_stream", returnValue);
    return cb(returnValue);
  }

  readableStream.on("error", (error) => {
    if (error.myError === false) { console.log("error from YT_DLP", error); }

    for (const stream of readableStream._readableState.pipes) {
      readableStream.unpipe(stream);
      stream.emit("error", error);
    }

    let returnValue = { error: true, comment: `Status Code ${error.statusCode}` }

    if (error.myError) {
      returnValue = { error: true, comment: error.info.message };
    }

    return finallyCallback(returnValue);
  });

  readableStream.on("finish", () => {
    readableStream.emit("fileSize", metadata.filesize);
    video.duration = metadata.duration;

    return finallyCallback({ error: false, comment: null, video: video });
  });

  return readableStream;
}