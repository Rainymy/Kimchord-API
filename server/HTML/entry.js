"use strict";
import Custom_Socket from "./util/socket.js";
import Uploader from "./util/Uploader.js";

const WEB_SOCKET_URI = `ws://${window.location.host}/WS`;
const io = Custom_Socket.createSocket(WEB_SOCKET_URI);

const upload_form = document.querySelector("#upload_form");
upload_form.addEventListener("submit", (event) => {
  event.preventDefault();
  const upload = event.target.querySelector("#upload_pad_file");
  
  console.log(upload.files);
  
  if (!upload.files[0]) { return; }
  
  Uploader(`${WEB_SOCKET_URI}`, upload.files[0]);
});

// io.addEventListener("message", async (message) => {
//   const [ event, data ] = JSON.parse(message.data);
// });

function createButton(text, callback) {
  const button = document.createElement("button");
  button.textContent = text;
  button.onclick = callback;
  
  return button;
}

const container = document.querySelector(".nav") || document.body;

const close_button = createButton("close", Custom_Socket.closeSocket);
const open_button = createButton("open", () => Custom_Socket.createSocket(WEB_SOCKET_URI));
const reconnect_button = createButton("reconnect", Custom_Socket.reconnectSocket);

container.appendChild(close_button);
container.appendChild(open_button);
container.appendChild(reconnect_button);