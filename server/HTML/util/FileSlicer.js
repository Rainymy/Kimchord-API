function FileSlicer(file) {
  this.file = file;
  this.sliceSize = 1024 * 1024;
  this.slices = Math.ceil(file.size / this.sliceSize);
  this.currentSlice = 0;
  
  this.getNextSlice = () => {
    let start = this.currentSlice * this.sliceSize;
    let end = Math.min((this.currentSlice+1) * this.sliceSize, file.size);
    ++this.currentSlice;
    this.slices--;
    
    return file.slice(start, end);
  }
}

export default FileSlicer;