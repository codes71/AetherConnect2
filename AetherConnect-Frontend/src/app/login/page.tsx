"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import * as z from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const AuthLoginForm = dynamic(
    () => import("@/components/auth-login-form").then((mod) => ({ default: mod.AuthLoginForm })),
    { ssr: false }
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Link href="/" className="flex items-center gap-2 text-foreground">
              <Logo />
              <span className="text-xl font-bold">Aether Connect</span>
            </Link>
          </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <Suspense fallback={<div>Loading form...</div>}>
          <AuthLoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
