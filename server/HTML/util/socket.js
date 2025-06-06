"use strict";

let socket;
let LAST_CONNECTED_SOCKET_URL;

function createSocket(url) {
  if (socket && socket.readyState === socket.CONNECTING) {
    return console.log("CONNECTING....");
  }
  
  if (socket && socket.readyState === socket.OPEN) {
    return console.log("Connection is Ready");
  }
  
  socket = new WebSocket(url);
  LAST_CONNECTED_SOCKET_URL = url;
  
  socket.binaryType = "arraybuffer";
  
  socket.onclose = (io) => { return console.log("Connection closed"); }
  socket.onerror = (io) => { return console.log(socket); }
  socket.onmessage = (io) => { return console.log("message:", io.data); }
  socket.onopen = (io) => {
    return console.log(`Socket opened at [ ${io.target.url} ]`);
  }
  
  console.log(`Opening Socket at [ ${socket.url} ]`);
  return socket;
}

function reconnectSocket() {
  if (socket.readyState === socket.OPEN) {
    return console.log("Still connected");
  }
  
  console.log("reconnecting......: ");
  socket = createSocket(LAST_CONNECTED_SOCKET_URL);
}

function closeSocket() {
  if (socket.readyState === socket.CLOSING) { return; }
  if (socket.readyState === socket.CLOSED) { return; }
  
  console.log("Closing connection...");
  socket.close();
}

export default {
  createSocket: createSocket,
  reconnectSocket: reconnectSocket,
  closeSocket: closeSocket
};