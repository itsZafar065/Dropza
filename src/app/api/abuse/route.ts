import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { reportAbuseSchema } from "@/lib/validations";
import { hashIp, hashToken } from "@/lib/crypto";
import { rateLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimiter.check(`abuse-report:${ip}`, 5, 60 * 1000); // 5 reports/min limit
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many abuse reports submitted. Please wait." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = reportAbuseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid report data" },
        { status: 400 }
      );
    }

    const { targetType, targetId, reason, details } = parsed.data;
    const reporterIpHash = hashIp(ip);

    let shareLinkId: string | null = null;
    let fileAssetId: string | null = null;
    let textShareId: string | null = null;

    if (targetType === "share") {
      // Find by token or id
      const share = await prisma.shareLink.findFirst({
        where: {
          OR: [{ token: targetId }, { tokenHash: hashToken(targetId) }, { id: targetId }],
        },
      });
      if (share) {
        shareLinkId = share.id;
        fileAssetId = share.fileAssetId;
      }
    } else if (targetType === "file") {
      fileAssetId = targetId;
    } else if (targetType === "text") {
      const text = await prisma.textShare.findFirst({
        where: { OR: [{ token: targetId }, { id: targetId }] },
      });
      if (text) textShareId = text.id;
    }

    const report = await prisma.abuseReport.create({
      data: {
        shareLinkId,
        fileAssetId,
        textShareId,
        reporterIpHash,
        reason,
        details: details || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Abuse report received. Our safety moderation team will inspect this link.",
      reportId: report.id,
    });
  } catch (err: any) {
    console.error("Abuse report error:", err);
    return NextResponse.json(
      { error: "Internal server error submitting report" },
      { status: 500 }
    );
  }
}
