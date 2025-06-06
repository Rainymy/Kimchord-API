import { PERMISSIONS } from "../types/routeModule";

const util = require('./util.ts').init();

export const PRESETS = {
  PERMISSIONS: PERMISSIONS
}

export function checkPermission(route, body) {
  for (let permission of route.permissions ?? []) {
    if (permission === PRESETS.PERMISSIONS.QUERY) {
      const { username, userId } = body;

      const query = body?.inputQuery ?? body?.videoData;
      const isStringQuery = route?.inputQuery ?? false;

      return util.validQueries(username, userId, query, isStringQuery);
    }
  }

  return { error: false, comment: null }
}