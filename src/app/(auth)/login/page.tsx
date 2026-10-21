"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DropzaLogo } from "@/components/common/DropzaLogo";
import { useToast } from "@/components/ui/Toast";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        toast.error("Sign in failed", res.error);
      } else {
        toast.success("Welcome back to Dropza!");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-[#DCE8DE] dark:border-[#1D3325] shadow-xl">
      <CardHeader className="text-center space-y-3">
        <div className="flex justify-center">
          <DropzaLogo size="lg" showText={false} />
        </div>
        <CardTitle className="text-2xl font-black text-[#0E1B13] dark:text-[#F0FDF4]">Sign in to Dropza</CardTitle>
        <CardDescription className="text-[#536E5A] dark:text-[#8EA895]">
          Manage your uploaded files, track download counts, and revoke active links.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#DCE8DE] dark:border-[#1D3325] text-center space-y-2 text-xs text-[#536E5A] dark:text-[#8EA895]">
          <p>
            Don't have an account yet?{" "}
            <Link href="/register" className="font-semibold text-[#10B981] dark:text-[#34D399] hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10 w-full">
      <Suspense fallback={<div className="p-12 text-center text-sm text-[#536E5A] dark:text-[#8EA895]">Loading sign in...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
