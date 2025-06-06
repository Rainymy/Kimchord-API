"use strict";
import puppeteer from 'puppeteer-extra';
const stealth = require('puppeteer-extra-plugin-stealth')();
puppeteer.use(stealth);

import {
  authenticate,
  saveCookies,
  generateMovement,
  parseToNetscape,
  waitUntilToken,
  handleCookieDialog,
  isLoggedIn
} from './puppyHandler.js';

export async function login(email: string, password: string, cookiePath) {
  if (!email || !password) { return [false]; }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // login with email and password
  await authenticate(page, email, password);

  // check for cookie dailog
  await handleCookieDialog(page);

  if (!(await isLoggedIn(page))) {
    await browser.close();
    return [null];
  }

  // generate some simulated user movement
  generateMovement(page);

  const auth = {
    cookies: await page.cookies(),
    identityToken: await waitUntilToken(page)
  }

  const container = [
    { path: cookiePath.json, data: JSON.stringify(auth, null, 2) },
    { path: cookiePath.netscape, data: parseToNetscape(auth.cookies) }
  ]

  const [succes, error] = await saveCookies(container);

  await browser.close();
  return [auth, error];
}