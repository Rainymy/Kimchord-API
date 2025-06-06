"use strict";
import { Cookie } from 'cookiefile';
import { makeWriteStream } from './handleFile.js';

const part1 = "ytd-button-renderer.ytd-consent-bump-v2-lightbox:nth-child(2)";
const part2 = " > yt-button-shape:nth-child(1) > button:nth-child(1)";
const cookieDialogSelector = part1 + part2;

const loginSelector = "yt-img-shadow.ytd-topbar-menu-button-renderer > img";

function sleep(miliseconds) {
  return new Promise((resolve) => setTimeout(resolve, miliseconds));
}

function waitUntilToken(page) {
  return new Promise(function (resolve, reject) {
    page.on('request', interceptedRequest => {
      const headers = interceptedRequest.headers();

      if (!headers["x-youtube-identity-token"]) { return; }
      resolve(headers["x-youtube-identity-token"]);
    });
  });
}

function parseToNetscape(cookieJSON) {
  let netscapeCookie = "# Netscape HTTP Cookie File\n\n";

  const shallowCopy = JSON.parse(JSON.stringify(cookieJSON));

  for (let sites of shallowCopy) {
    sites.httpOnly = false;

    const cookie = new Cookie(sites);
    const copy = cookie.toString().split("\t")
    copy[1] = "TRUE";

    netscapeCookie += copy.join("\t");
  }

  return netscapeCookie;
}

async function authenticate(page, email, password) {
  await page.goto("https://accounts.google.com/signin/v2/identifier", {
    waitUntil: "networkidle2"
  });

  await page.type("#identifierId", email);
  await page.click("#identifierNext");

  await page.waitForSelector("#password", { visible: true, hidden: false, });

  await page.type(
    "#password > div.aCsJod.oJeWuf > div > div.Xb9hP > input", password
  );

  await sleep(1000);
  await page.click("#passwordNext > div > button");

  await sleep(1000);
  await page.goto("https://www.youtube.com/", { waitUntil: "networkidle2", });

  return page;
}

function writeFile(filePath, data) {
  return new Promise(async function (resolve, reject) {
    const stream = await makeWriteStream(filePath);

    stream.on("finish", resolve);

    stream.write(data);
    stream.end();
  });
}

async function saveCookies(files) {
  const errors = [];
  for (let file of files) {
    const error = await writeFile(file.path, file.data);
    if (error) { errors.push(error); }
  }
  return [!errors.length, errors];
}

async function handleCookieDialog(page) {
  const hasCookieDialog = await page.$(cookieDialogSelector) !== null;
  if (hasCookieDialog) {
    await page.click(cookieDialogSelector);
    await sleep(500);
  }
}
async function isLoggedIn(page) {
  return await page.$(loginSelector) != null;
}

async function generateMovement(page) {
  const row = "ytd-rich-grid-row.style-scope:nth-child(2) > div:nth-child(1)";
  const childRow = await page.$$(`${row} > :nth-of-type(n)`);

  for await (let child of childRow) {
    if (page.isClosed()) { break; }
    await child.hover();
    if (page.isClosed()) { break; }
    await sleep(1500);
  }
}

export const sleep = sleep;
export const waitUntilToken = waitUntilToken;
export const parseToNetscape = parseToNetscape;
export const authenticate = authenticate;
export const saveCookies = saveCookies;
export const handleCookieDialog = handleCookieDialog;
export const generateMovement = generateMovement;
export const isLoggedIn = isLoggedIn;