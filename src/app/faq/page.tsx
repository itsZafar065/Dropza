import React from "react";
import { HelpCircle, CloudUpload, Radio, Lock, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function FAQPage() {
  const faqs = [
    {
      q: "What is the difference between Cloud Share and Direct Transfer?",
      a: "Cloud Share uploads your file to encrypted private object storage and creates a shareable link that anyone can open until it expires. Direct Transfer uses WebRTC DataChannels to stream files directly between two devices in real time without persisting anything in the cloud.",
      icon: Zap,
    },
    {
      q: "Do I need to create an account to share files?",
      a: "No! Guest sharing allows you to upload files up to 50MB, start WebRTC direct transfers, or share text snippets immediately. Creating a free account raises your upload limit to 2GB and unlocks a dashboard to manage your uploads.",
      icon: CloudUpload,
    },
    {
      q: "How does Direct Transfer work between mobile and computer?",
      a: "When you click 'Direct Transfer', Dropza generates a 6-character room code and a QR code. On your other device (e.g. your smartphone), simply scan the QR code or visit Dropza and enter the code. The two devices establish an encrypted peer connection directly over your network.",
      icon: Radio,
    },
    {
      q: "Can I password-protect my share links?",
      a: "Yes. Both Cloud Share links and Text snippets support optional passphrases. When set, anyone opening the link will be asked to enter the passphrase before the file download or text content is unlocked.",
      icon: Lock,
    },
    {
      q: "How long do share links remain valid?",
      a: "You can choose an expiration time of 1 hour, 24 hours, or 7 days. You can also set a download limit (for example, self-destruct after 1 download). You can also manually revoke any link at any moment.",
      icon: HelpCircle,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full text-left">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Help & Answers</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">Everything you need to know about sharing on Dropza</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, i) => {
          const Icon = faq.icon;
          return (
            <Card key={i} className="border-[#DCE8DE] dark:border-[#1D3325]">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-3 text-[#0E1B13] dark:text-[#F0FDF4]">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span>{faq.q}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 text-xs sm:text-sm text-[#536E5A] dark:text-[#8EA895] leading-relaxed pl-4 sm:pl-14">
                {faq.a}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
