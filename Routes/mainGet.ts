"use strict";
async function main(req, res, GLOBAL_OBJECTS) {
  const { fileManager } = GLOBAL_OBJECTS;
  
  return await res.send("Main Page. Server working fine.");
}

module.exports = {
  method: "get",
  route: "/",
  skipLoad: false,
  permissions: [],
  main: main
};