import React from "react";
import { FileCheck, ShieldAlert, Scale } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8 w-full text-left">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-[#10B981] dark:text-[#34D399] border border-emerald-500/20 dark:border-[#1D3325] text-xs font-semibold">
          <Scale className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Terms of Service</span>
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#0E1B13] dark:text-[#F0FDF4] tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs text-[#536E5A] dark:text-[#8EA895]">Effective Date: October 2026</p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-[#536E5A] dark:text-[#8EA895] leading-relaxed">
        <Card className="border-[#DCE8DE] dark:border-[#1D3325]">
          <CardContent className="p-5 sm:p-8 space-y-5">
            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-[#10B981]" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Dropza, you agree to comply with and be bound by these Terms of Service. If you do not agree, you must discontinue using the platform immediately.
            </p>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] flex items-center gap-2 pt-4">
              <ShieldAlert className="w-5 h-5 text-[#10B981]" /> 2. Acceptable Use Policy
            </h2>
            <p>You agree not to use Dropza to distribute, share, or store:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs">
              <li>Malicious software, viruses, worms, spyware, or ransomware.</li>
              <li>Content that infringes upon copyright, patents, or intellectual property rights.</li>
              <li>Phishing links or deceptive fraudulent materials.</li>
              <li>Unlawful, harassing, defamatory, or harmful content.</li>
            </ul>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] pt-4">
              3. Abuse Reports & Termination
            </h2>
            <p>
              Dropza provides a proactive abuse reporting interface for public links. We reserve the right to immediately revoke any share link, delete offending files, and terminate user accounts that violate our safety policies.
            </p>

            <h2 className="text-base sm:text-lg font-bold text-[#0E1B13] dark:text-[#F0FDF4] pt-4">
              4. Disclaimer of Warranty
            </h2>
            <p>
              Dropza is provided "as is" without warranty of any kind. While we maintain high availability and data integrity, you are responsible for maintaining backups of critical files.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
