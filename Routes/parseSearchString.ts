"use strict";
import { inspect } from 'node:util';
import { PRESETS } from '../Components/permission.js';
import { RouteModule } from '../types/routeModule.js';

function formatLogData(data: any) {
  return inspect(data, { colors: true, depth: 2, maxArrayLength: 1 });
}

async function parseSearchString(req, res, GLOBAL_OBJECTS) {
  const { inputQuery } = req.body;
  const { youtube } = GLOBAL_OBJECTS

  const searchInput = youtube.removeTextFormat(inputQuery);

  console.log("------------------------------------------------------");
  console.log("Formating      :", inputQuery);
  console.log("Formated input :", searchInput);
  console.log("------------------------------------------------------");

  const video = await youtube.getYoutubeData(searchInput);

  if (video.length === 0) {
    console.log(`[ Failed to parse - ${searchInput}]`);
  }

  console.log("Parsed data: ", formatLogData(video));
  return res.send(video);
}

const mod: RouteModule = {
  method: "post",
  route: "/parseSearchString",
  skipLoad: false,
  inputQuery: true,
  permissions: [
    PRESETS.PERMISSIONS.QUERY
  ],
  main: parseSearchString,
}
