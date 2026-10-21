export const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
export const BUFFER_THRESHOLD = 1024 * 1024; // 1 MB backpressure limit

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  totalChunks: number;
}

export async function* getFileChunks(file: File, chunkSize: number = CHUNK_SIZE) {
  let offset = 0;
  let chunkIndex = 0;

  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const arrayBuffer = await slice.arrayBuffer();
    yield {
      chunkIndex,
      data: arrayBuffer,
      isLast: offset + chunkSize >= file.size,
    };
    offset += chunkSize;
    chunkIndex++;
  }
}

export class ChunkAssembler {
  private chunks: ArrayBuffer[] = [];
  private receivedBytes = 0;
  private totalBytes = 0;
  private fileName = "";
  private mimeType = "";

  constructor(meta: FileMetadata) {
    this.totalBytes = meta.size;
    this.fileName = meta.name;
    this.mimeType = meta.type || "application/octet-stream";
  }

  public addChunk(chunk: ArrayBuffer): { progress: number; isComplete: boolean } {
    this.chunks.push(chunk);
    this.receivedBytes += chunk.byteLength;

    const progress = Math.min(100, Math.round((this.receivedBytes / this.totalBytes) * 100));
    const isComplete = this.receivedBytes >= this.totalBytes;

    return { progress, isComplete };
  }

  public buildBlob(): Blob {
    return new Blob(this.chunks, { type: this.mimeType });
  }

  public getFileName(): string {
    return this.fileName;
  }
}
