"use strict";
const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require("node:stream");
const YTDlpWrap = require('yt-dlp-wrap').default;
const chalk = require('chalk');

const { plugins } = require('../config.json');
const pathToBinaryFolder = path.join(__dirname, "..", plugins.YTDLP.path);

if (!plugins.YTDLP.fileFormat.includes("[%_tag_name_%]")) {
  const missingTag = "MISSING REQUIRED TAG in config file: [%_tag_name_%]";
  console.error(missingTag);
  throw missingTag;
}

function YTDlp() {
  this.latestRelease = null;
  this.version = null;
  
  this.isInit = false;
  this.ytdlp = null;
  
  this.hasCookie = false;
  this.cookiePath = null;
  
  this.cacheStorage = new Map();
  this.cache = {
    has: (id) => {
      if (!this.cacheStorage.has(id)) { return false; }
      const cache_temp = this.cacheStorage.get(id);
      
      // refresh cache after every 0.5 hour (30 minutes)
      const diff = (new Date() - cache_temp.cacheStartDate) / 1000 / 60 / 60;
      if (diff > 0.5) { return false; }
      
      return true;
    },
    get: (id) => {
      return this.cacheStorage.get(id);
    },
    append: (id, data) => {
      const combine = { ...data, cacheStartDate: new Date() }
      return this.cacheStorage.set(id, combine);
    }
  }
  
  this.setCookie = (cookiePath) => {
    if (!cookiePath) { return; }
    
    this.cookiePath = cookiePath;
    this.hasCookie = true;
  }
  this.getLatestRelease = async () => {
    if (this.latestRelease !== null) { return this.latestRelease; }
    
    const githubReleasesData = await YTDlpWrap.getGithubReleases(1, 2);
    this.latestRelease = githubReleasesData[0];
    
    return this.latestRelease;
  }
  this.getCurrentVersion = () => {
    if (this.version !== null) { return this.version; }
    
    const fileNames = fs.readdirSync(pathToBinaryFolder);
    for (let fileName of fileNames) {
      const temp = plugins.YTDLP.fileFormat.split("[%_tag_name_%]")[0];
      if (!fileName.startsWith(temp)) { continue; }
      
      const dateSplit = fileName.split(temp)[1].split(".");
      
      const ext = this.getPlatformExecutable();
      const correctDateFormat = dateSplit.length === 4 && dateSplit[3] === ext;
      
      if (correctDateFormat) {
        this.version = fileName;
      }
    }
    
    return this.version;
  }
  this.getPlatformExecutable = () => {
    const opsys = process.platform;
    if (opsys === "win32") { return "exe"; }
    if (opsys === "darwin") { return "app"; }
    return "bin";
  }
  this.formatFileName = (name) => {
    const extension = this.getPlatformExecutable();
    
    let temp = plugins.YTDLP.fileFormat;
    
    temp = temp.split("[%_tag_name_%]").join(name);
    
    if (plugins.YTDLP.fileFormat.includes("[%_extension_%]")) {
      temp = temp.split("[%_extension_%]").join(extension);
    }
    
    return temp;
  }
  this.isUpdateRequired = async () => {
    const current = this.getCurrentVersion();
    
    // encoding tag_name to match the current version
    const latest = await this.getLatestRelease();
    const encodedTag = encodeURIComponent(latest.tag_name);
    const fileName = this.formatFileName(encodedTag);
    
    return fileName !== current;
  }
  this.downloadLatestRelease = async () => {
    const githubReleasesData = await this.getLatestRelease();
    
    // in case tag_name has slash(/) or escape characters
    const releaseDate = encodeURIComponent(githubReleasesData.tag_name);
    const fileName = this.formatFileName(releaseDate);
    const pathToBinary = path.join(pathToBinaryFolder, fileName);
    const platform = process.platform;
    
    await YTDlpWrap.downloadFromGithub(pathToBinary, releaseDate, platform);
    
    return {
      tag_name: githubReleasesData.tag_name,
      path: pathToBinary,
      platform: platform
    };
  }
  this.utils = {
    convertStrongToIntMS: (string) => {
      return +(string.split(':').reduce((acc, time) => (60 * acc) + +time));
    },
    getWorstVideo: (formats) => {
      return formats.reduce((acc, cur) => {
        return acc.vbr > cur.vbr ? cur : acc;
      }, { vbr: Number.POSITIVE_INFINITY });
    },
    getBestAudio: (formats) => {
      return formats.reduce((acc, cur) => {
        return acc.abr < cur.abr ? cur : acc;
      }, { abr: Number.NEGATIVE_INFINITY });
    }
  }
  this.createDownload = (url, isLive) => {
    const args = [ url ];
    
    if (!isLive) { args.push("-f bestaudio[ext=m4a]") }
    if (this.hasCookie) { args.push(`--cookies=${this.cookiePath}`); }
    
    const readableStream = new PassThrough();
    this.ytdlp.execStream(args).pipe(readableStream);
    
    return readableStream;
  }
  this.getMetadata = async (url) => {
    if (!url) { return; }
    if (this.cache.has(url)) { return this.cache.get(url); }
    
    const meta = await this.ytdlp.getVideoInfo(url);
    
    if (meta.is_live) {
      const worstFormat = this.utils.getWorstVideo(meta.formats);
      
      worstFormat.duration = 0;
      worstFormat.is_live = meta.is_live;
      
      this.cache.append(url, worstFormat);
      return worstFormat;
    }
    
    const audioOnly = meta.formats.filter(val => val.resolution === "audio only");
    const extOnly = audioOnly.filter(val => val.ext === "m4a");
    const bestaudio = this.utils.getBestAudio(extOnly);
    
    bestaudio.duration = this.utils.convertStrongToIntMS(meta.duration_string);
    bestaudio.is_live = meta.is_live;
    
    this.cache.append(url, bestaudio);
    return bestaudio;
  }
  this.init = async () => {
    if (this.isInit) { return this; }
    
    console.log("------------------------------------------------------");
    console.log("YT_DLP");
    
    const hasVersion = this.getCurrentVersion() !== null;
    const shouldUpdate = await this.isUpdateRequired();
    
    console.log("╠ Current version  :", chalk.cyan(this.getCurrentVersion()));
    console.log("╠ Update available :", shouldUpdate);
    
    if (!hasVersion || shouldUpdate) {
      const download = await this.downloadLatestRelease();
      console.log(" ╠ Tag name :", download.tag_name);
      console.log(" ╠ Path     :", download.path);
      console.log(" ╚ platform :", download.platform);
    }
    
    const pathToBinary = path.resolve(
      __dirname,
      pathToBinaryFolder,
      this.getCurrentVersion()
    );
    
    console.log("╚ Path To Binary   :", chalk.cyan(pathToBinary));
    console.log("------------------------------------------------------");
    
    this.ytdlp = new YTDlpWrap(pathToBinary);
    this.isInit = true;
    
    return this;
  }
  
  return this;
}

module.exports = new YTDlp();