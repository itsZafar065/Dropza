import { describe, it, expect } from "vitest";
import { ChunkAssembler, FileMetadata } from "@/lib/webrtc/chunker";

describe("WebRTC Chunking & Assembler", () => {
  it("should assemble ArrayBuffer chunks into a complete Blob and report progress", async () => {
    const meta: FileMetadata = {
      name: "test-data.txt",
      size: 12,
      type: "text/plain",
      totalChunks: 3,
    };

    const assembler = new ChunkAssembler(meta);

    // Chunk 1: "Drop" (4 bytes)
    const chunk1 = new TextEncoder().encode("Drop").buffer;
    const res1 = assembler.addChunk(chunk1);
    expect(res1.isComplete).toBe(false);
    expect(res1.progress).toBe(33);

    // Chunk 2: "za--" (4 bytes)
    const chunk2 = new TextEncoder().encode("za--").buffer;
    const res2 = assembler.addChunk(chunk2);
    expect(res2.isComplete).toBe(false);
    expect(res2.progress).toBe(67);

    // Chunk 3: "Fast" (4 bytes)
    const chunk3 = new TextEncoder().encode("Fast").buffer;
    const res3 = assembler.addChunk(chunk3);
    expect(res3.isComplete).toBe(true);
    expect(res3.progress).toBe(100);

    const blob = assembler.buildBlob();
    expect(blob.size).toBe(12);
    expect(blob.type).toBe("text/plain");

    const text = await blob.text();
    expect(text).toBe("Dropza--Fast");
  });
});
