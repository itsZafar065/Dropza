import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createTextShareSchema } from "@/lib/validations";
import { generateSecureToken, hashPassword } from "@/lib/crypto";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimiter.check(`text-share:${ip}`, 30, 60 * 1000); // 30 per min
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many text share requests. Please slow down." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const body = await req.json();
    const parsed = createTextShareSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { content, isUrl, expiryHours, password, maxViews } = parsed.data;

    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const passwordHash = password ? await hashPassword(password) : null;
    const token = generateSecureToken(16);

    let previewTitle: string | null = null;
    let previewDesc: string | null = null;

    // Safe URL metadata extraction if URL
    if (isUrl) {
      try {
        const parsedUrl = new URL(content.trim());
        previewTitle = parsedUrl.hostname;
        previewDesc = parsedUrl.pathname.length > 1 ? parsedUrl.pathname : "Website Link";
      } catch {
        // Not a valid URL, ignore preview
      }
    }

    const textShare = await prisma.textShare.create({
      data: {
        token,
        content,
        isUrl,
        previewTitle,
        previewDesc,
        userId,
        passwordHash,
        maxViews: maxViews || null,
        expiresAt,
      },
    });

    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const shareUrl = `${origin}/text?t=${token}`;

    return NextResponse.json({
      success: true,
      token: textShare.token,
      shareUrl,
      expiresAt: textShare.expiresAt,
    });
  } catch (err: any) {
    console.error("Create text share error:", err);
    return NextResponse.json(
      { error: "Failed to create text share snippet" },
      { status: 500 }
    );
  }
}
