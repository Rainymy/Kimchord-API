"use strict";
import { server } from './config.json';

import { yellow, cyanBright } from 'chalk';
import express from 'express';
const app = express().disable("x-powered-by");

import { getAllRoute, loadAllRoutes } from './Components/handleRoute';
import { getSaveLocation, getFileCount } from './Components/util';
const baseFolder = getSaveLocation();

import { YouTube } from './API/youtube';
import File_Manager from './Components/FileManager';
const fileManager = new File_Manager();

const GLOBAL_OBJECTS = {
  fileManager: null,
  youtube: new YouTube(),
  cookieManager: new Map()
}

const routes = getAllRoute();
loadAllRoutes(app, routes, GLOBAL_OBJECTS);

async function onServerStart() {
  console.log("------------------------------------------------------");
  console.log("Basic Info");
  console.log("╠ Base save folder :", yellow(baseFolder));
  console.log("╚ Load song count  :", getFileCount());
  console.log("------------------------------------------------------");
  GLOBAL_OBJECTS.fileManager = await fileManager.init(baseFolder);

  const listenURL = `${server.location}:${server.port}`;
  const webURL = `${listenURL}/dashboard`;
  console.log("------------------------------------------------------");
  console.log(`Server listening at ${cyanBright(listenURL)}`);
  console.log(`Web UI at ${cyanBright(webURL)}`);
  console.log("------------------------------------------------------");
}

app.listen(server.port, onServerStart);