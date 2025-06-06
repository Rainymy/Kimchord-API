import FileSlicer from './FileSlicer.js';

const uploadFile = new Map();

function Uploader(url, file) {
  const fileSlicer = new FileSlicer(file);
  const socket = new WebSocket(url);
  
  const request = async () => {
    const data = ["upload", {
      name: fileSlicer.file.name,
      data: await fileSlicer.getNextSlice().text(),
      isDone: fileSlicer.slices < 0
    }];
    
    console.log("Uploader parsed data: ", data);
    
    return data;
  }
  
  socket.onopen = async function () {
    if (uploadFile.get(fileSlicer.file.name)) {
      return socket.close(3001, "Existing file connection");
    }
    
    uploadFile.set(fileSlicer.file.name, fileSlicer);
    
    socket.send(JSON.stringify(await request()));
  }
  
  socket.onmessage = async function(message) {
    const [ event, data ] = JSON.parse(message.data);
    
    if(event !== "upload") { return; }
    
    const current = uploadFile.get(data);
    
    socket.send(JSON.stringify(await request()));
    
    if(fileSlicer.slices >= 0) { return }
    
    console.log("Transfer complete!");
    uploadFile.delete(current.file.name);
    socket.close(3000, "Transfer complete");
  }
  
  return;
}

export default Uploader;