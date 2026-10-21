"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface QrCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeDisplay({ value, size = 200, label }: QrCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, {
      width: size * 2, // 2x density for retina display
      margin: 2,
      color: {
        dark: "#0E1B13",
        light: "#FFFFFF",
      },
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error("QR Generation error", err));
  }, [value, size]);

  const copyUrl = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `dropza-qr-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white dark:bg-[#111C15] border border-[#DCE8DE] dark:border-[#1D3325] shadow-sm max-w-xs w-full mx-auto">
      {dataUrl ? (
        <div className="p-3 bg-white rounded-xl shadow-inner border border-[#DCE8DE] flex items-center justify-center max-w-full">
          <img
            src={dataUrl}
            alt={label || "Dropza QR Code"}
            width={size}
            height={size}
            className="rounded-lg object-contain max-w-full h-auto"
          />
        </div>
      ) : (
        <div
          style={{ width: "100%", maxWidth: size, height: size }}
          className="flex items-center justify-center bg-[#EFF6F0] dark:bg-[#0B120E] rounded-xl animate-pulse text-xs text-[#536E5A] dark:text-[#8EA895]"
        >
          Generating QR...
        </div>
      )}

      {label && <p className="text-xs font-semibold text-[#0E1B13] dark:text-[#F0FDF4] text-center">{label}</p>}

      <div className="flex items-center gap-2 w-full pt-1">
        <Button variant="outline" size="sm" onClick={copyUrl} className="flex-1 text-xs">
          {copied ? <Check className="w-3.5 h-3.5 text-[#10B981] mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
          {copied ? "Copied" : "Copy Link"}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadQr} className="text-xs px-2.5" title="Download QR image">
          <Download className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
