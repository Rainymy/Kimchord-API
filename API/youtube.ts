"use strict";
import https from 'node:https';

import ytsr from 'ytsr';
import ytpl from 'ytpl';
import { getVideoDurationInSeconds } from "get-video-duration";

const cache = new Map();
const CACHE_TIME = 60 * 5;

export function YouTube() {
  function removeExtraImgQuery(url) {
    const parseURL = new URL(url);
    return parseURL.origin + parseURL.pathname;
  }

  function tryParseToJsonElseToText(data) {
    try { return JSON.parse(data); }
    catch (e) { return data; }
  }

  async function getBasicInfo(videoUrl) {
    return new Promise(function (resolve, reject) {
      const baseUrl = `https://www.youtube.com/oembed?url=${videoUrl}&format=json`;
      const nativeHttps = https.get(baseUrl, (res) => {
        let data = "";

        res.on("data", (chunk) => { return data += chunk; });
        res.on("end", () => {
          const info = tryParseToJsonElseToText(data);
          const response = typeof info === "string" ? { title: info } : info;

          if (typeof info !== "string") { return resolve(response); }
          if (info === "Not Found") { return resolve(); }
          if (info === "Bad Request") { return resolve(); }

          return resolve({ title: info });
        });
      });

      nativeHttps.on("error", (err) => reject(err));
    });
  }

  async function parseYTDLBasicInfo(videoId) {
    if (!videoId) { return; }

    const cacheInfo = cache.get(videoId);
    const lastCacheTimeInSecond = (new Date() - cacheInfo?.createTime) / 1000;

    if (cacheInfo && lastCacheTimeInSecond < CACHE_TIME) {
      cacheInfo.requestedTime = (new Date()).toLocaleString();
      return cacheInfo;
    }

    const videoURL = `https://www.youtube.com/watch?v=${videoId}`;

    try {
      const video = await getBasicInfo(videoURL);
      if (!video) { return; }

      const dataInfo = {
        url: videoURL,
        id: videoId,
        type: "video",
        title: video.title,
        requestedTime: (new Date()).toLocaleString(),
        createTime: new Date(),
        thumbnail: video.thumbnail_url
      }

      cache.set(videoId, dataInfo);

      return dataInfo;
    }
    catch (e) { return; }
  }

  function isValidYoutubeHostLink(host) {
    const hostlink = host.substring(0, 4) === "www." ? host.substring(4) : host;
    const youtubeValidLinkList = [
      "youtube.com",
      "m.youtube.com",
      "youtu.be",
      "youtube-nocookie.com"
    ];

    // if hostlink matches a link in the array returns true.
    return youtubeValidLinkList.indexOf(hostlink) >= 0;
  }

  this.removeTextFormat = function (inputText) {
    if (!inputText) { return inputText; }

    let removedText;

    for (let character of ["*", "%<>", "`", "~~~", "_"]) {
      const firstLetter = inputText[0];
      const lastLetter = inputText[inputText.length - 1];

      let currentText = (removedText ?? inputText);

      if (character.charAt(0) === "%") {
        const charLength = Math.ceil((character.length - 1) / 2);
        const firstHalf = character.substring(1, charLength);
        const secondHalf = character.substring(charLength, character.length);

        if (firstLetter === firstHalf && lastLetter === secondHalf) {
          removedText = currentText.substring(1, currentText.length - 1);
        }

        continue;
      }

      if (firstLetter === character && lastLetter === character) {
        const cutString = currentText.substring(1, currentText.length - 1);
        removedText = this.removeTextFormat(cutString);
      }
    }

    return removedText ?? inputText;
  }

  this.getVideoDurationInSeconds = async function (resourcePath) {
    return await getVideoDurationInSeconds(resourcePath);
  }

  this.getYoutubeData = async function (searchInput) {
    if (!searchInput) { return []; }

    let video;
    let isValidLink = false;

    try {
      const parsed_URL = new URL(searchInput);
      isValidLink = true;

      if (!isValidYoutubeHostLink(parsed_URL.host)) { throw "Not a youtube link"; }

      video = await this.getVideo(parsed_URL) ?? await this.getPlaylist(parsed_URL);
    }
    catch (e) {
      try {
        if (isValidLink) { throw "Exiting cause of the valid URL link"; }

        const foundVideos = await this.searchVideos(searchInput);
        video = await this.getVideoByID(foundVideos[0]?.id);
      }
      catch (err) {
        if (!isValidLink) {
          console.log(err);
        }
      }
    }

    return video ?? [];
  }

  this.getVideo = async function ({ search, host, pathname }) {
    let videoId;

    if (host === "youtu.be" && pathname.length === 12) {
      videoId = pathname.substring(1);
    }
    else {
      const url = new URLSearchParams(search);
      videoId = url.get("v");
    }

    return await parseYTDLBasicInfo(videoId);
  }

  this.getVideoByID = async function (videoId) {
    return await parseYTDLBasicInfo(videoId);
  }

  this.searchVideos = async function (input) {
    const filter = await ytsr.getFilters(input);
    if (!filter) { return []; }
    const filter1 = filter.get("Type").get("Video");
    if (!filter1.url) { return []; }

    const searchResults = await ytsr(filter1.url, { limit: 5 });

    return searchResults.items;
  }

  this.getPlaylist = async function ({ search, pathname }) {
    if (pathname !== "/playlist") { return; }

    const url = new URLSearchParams(search);
    const playListId = url.get("list");

    let response;
    try { response = await ytpl(playListId); }
    catch (e) { return false; }

    for (let item of response.items) {
      const temp_url = new URL(item.url);
      const temp_url_1 = new URL(item.url);

      delete item.index;
      delete item.shortUrl;
      delete item.thumbnails;
      delete item.isPlayable;

      item.thumbnail = removeExtraImgQuery(item.bestThumbnail.url);
      delete item.bestThumbnail;

      item.duration = item.durationSec;
      delete item.durationSec;

      for (let param of temp_url.searchParams.keys()) {
        if (param === "v") { continue; }
        temp_url_1.searchParams.delete(param);
      }

      item.url = temp_url_1.toString();
    }

    return {
      type: "playlist",
      title: response.title,
      thumbnail: response.bestThumbnail.url,
      itemCount: response.estimatedItemCount,
      views: response.views,
      playlistURL: response.url,
      playlist: response.items
    }
  }
}