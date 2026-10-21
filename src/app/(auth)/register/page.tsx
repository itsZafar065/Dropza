"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { DropzaLogo } from "@/components/common/DropzaLogo";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        toast.error("Registration failed", data.error);
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");

      // Automatically sign the user in
      const signInRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (signInRes?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        router.push("/login");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6 sm:my-10 w-full">
      <Card className="w-full max-w-md border-[#DCE8DE] dark:border-[#1D3325] shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <DropzaLogo size="lg" showText={false} />
          </div>
          <CardTitle className="text-2xl font-black text-[#0E1B13] dark:text-[#F0FDF4]">Create your account</CardTitle>
          <CardDescription className="text-[#536E5A] dark:text-[#8EA895]">
            Unlock 2GB upload limits, persistent sharing links, and file management tools.
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
              label="Full Name or Handle"
              type="text"
              placeholder="Alex Parker"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

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
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
              Create Account
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#DCE8DE] dark:border-[#1D3325] text-center text-xs text-[#536E5A] dark:text-[#8EA895]">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[#10B981] dark:text-[#34D399] hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
