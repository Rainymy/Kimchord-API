"use strict";
import fs from 'node:fs';
import path from 'node:path';
import { login } from './puppy';
import { email, password } from '../config.json';

function Cookies(): void {
  this.cookiesPath = path.join(__dirname, "../cookies.json");
  this.netscapeCookiePath = path.join(__dirname, "../netscapeCookie.txt");

  this.exists = () => { return fs.existsSync(this.cookiesPath); }

  this.login = () => {
    return new Promise((resolve, reject) => {
      const cookiePaths = {
        json: this.cookiesPath,
        netscape: this.netscapeCookiePath
      }

      return login(email, password, cookiePaths).then(resolve).catch(reject);
    });
  }

  this.load = () => {
    try { return JSON.parse(fs.readFileSync(this.cookiesPath, "utf8")); }
    catch (e) { return console.log(e); }
  }

  this.get = async () => {
    console.log("------------------------------------------------------");
    console.log("Checking Cookies...");

    let cookie;

    try {
      if (this.exists()) {
        console.log("loading Cookies...");
        cookie = this.load();
      }
      else {
        console.log("Generating Cookie");
        const [auth, error] = await this.login();

        if (auth === false) {
          console.log(`Login detail - ${(!email ? "Email" : "Password")} is missing.`);
        }
        else if (auth === null) {
          console.log("Login failed - login detail is wrong (email/password).");
        }
        else if (!error.length) {
          console.log("Succesfully logged in and saved cookies.");
          cookie = auth;
        }
        else {
          console.log("Error in Cookies: ", error);
        }
      }
    }
    catch (e) {
      console.log("Error (catch) on Cookies.", e);
    }

    if (cookie) { console.log("Cookies Ready!"); }

    console.log("------------------------------------------------------");
    return cookie;
  }

  return this;
}

export default new Cookies();