import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getLocalFilePath, verifyLocalSignedToken } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    const exp = req.nextUrl.searchParams.get("exp");
    const sig = req.nextUrl.searchParams.get("sig");

    if (!key || !exp || !sig) {
      return NextResponse.json(
        { error: "Missing required storage authorization parameters" },
        { status: 400 }
      );
    }

    const expTime = parseInt(exp, 10);
    if (isNaN(expTime)) {
      return NextResponse.json({ error: "Invalid expiry timestamp" }, { status: 400 });
    }

    const isValid = verifyLocalSignedToken("put", key, expTime, sig);
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired upload authorization" },
        { status: 403 }
      );
    }

    const localPath = getLocalFilePath(key);
    const buffer = Buffer.from(await req.arrayBuffer());

    fs.writeFileSync(localPath, buffer);

    return new NextResponse(null, { status: 200 });
  } catch (err: any) {
    console.error("Local storage PUT error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to write local file" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    const filename = req.nextUrl.searchParams.get("filename") || "download";
    const exp = req.nextUrl.searchParams.get("exp");
    const sig = req.nextUrl.searchParams.get("sig");

    if (!key || !exp || !sig) {
      return NextResponse.json(
        { error: "Missing required storage authorization parameters" },
        { status: 400 }
      );
    }

    const expTime = parseInt(exp, 10);
    if (isNaN(expTime)) {
      return NextResponse.json({ error: "Invalid expiry timestamp" }, { status: 400 });
    }

    const isValid = verifyLocalSignedToken("get", key, expTime, sig);
    if (!isValid) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired download authorization" },
        { status: 403 }
      );
    }

    const localPath = getLocalFilePath(key);
    if (!fs.existsSync(localPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(localPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (err: any) {
    console.error("Local storage GET error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to read local file" },
      { status: 500 }
    );
  }
}
