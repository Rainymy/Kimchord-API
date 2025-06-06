"use strict";
import fs from 'node:fs';
import path from 'node:path';

import { checkPermission } from './permission.js';

export function getAllRoute() {
  const routes = [];
  const basePath = path.join(__dirname, "../Routes");

  for (const routePath of fs.readdirSync(basePath)) {
    const modulePath = path.join(basePath, routePath);

    const route = require(modulePath);
    if (route.skipLoad) { continue; }

    routes.push(route);
  }

  return routes;
}

function isValidMethod(method) {
  if (method === "get") { return true; }
  if (method === "post") { return true; }

  return false;
}

export function loadAllRoutes(server, routes, GLOBAL_OBJECTS) {
  for (let route of routes) {
    const method = route.method?.toLowerCase();
    const apiRoute = route.route;
    const main = route.main;

    if ((!method || !apiRoute) || !main) {
      console.log("Skipping (missing values): ", route);
      continue;
    }

    if (!isValidMethod(method)) {
      console.log("Invalid method: ", `"${method}"`, route);
      continue;
    }

    server[method](apiRoute, async (req, res) => {
      const { error, comment } = checkPermission(route, req.body);

      console.log({ error, comment }, route.route);
      if (error) { return res.send({ error: error, comment: comment }); }

      try { await main(req, res, GLOBAL_OBJECTS); }
      catch (e) { res.send({ error: true, comment: "INTERNAL ERROR" }) }

      return;
    });
  }

  return;
}