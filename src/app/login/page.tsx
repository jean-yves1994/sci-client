"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { ThemeToggle } from "@/components/shell";
import { ApiError, NetworkError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface FormError {
  title: string;
  hint?: string;
  requestId?: string;
}

/**
 * Turns a failure into something the user can act on.
 *
 * Genuine credential failures stay deliberately vague — distinguishing "no such
 * account" from "wrong password" would let anyone test which addresses hold
 * accounts. Everything else is reported honestly, because a server that is not
 * running is not a wrong password.
 */
function describeError(error: unknown): FormError {
  if (error instanceof NetworkError) {
    return {
      title: "Cannot reach the server.",
      hint: "Check that the API is running an try again.",
    };
  }
  if (!(error instanceof ApiError))
    return { title: "Something went wrong. Please try again." };

  switch (error.code) {
    case "AUTH_INVALID_CREDENTIALS":
      return { title: "The email address or password is incorrect." };
    case "AUTH_ACCOUNT_LOCKED":
    case "AUTH_ACCOUNT_DISABLED":
    case "AUTH_ACCOUNT_SUSPENDED":
    case "VALIDATION_ERROR":
      return { title: error.message };
    default:
      break;
  }

  if (error.status === 429) {
    return {
      title: "Too many sign-in attempts.",
      hint: "Further attempts are blocked briefly for security.",
    };
  }
  if (error.status >= 500) {
    return {
      title: "A server error occurred while signing you in.",
      hint: "This is not a problem with your password.",
      requestId: error.requestId,
    };
  }
  return { title: error.message, requestId: error.requestId };
}

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<FormError | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const signedIn = await login(email, password);
      router.push(
        signedIn.mustChangePassword
          ? "/profile?changePassword=1"
          : "/dashboard",
      );
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-canvas">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-[48%] lg:px-16">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <span className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-xs font-bold text-white">
              SCI
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-ink">
              Welcome back
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Sign in to continue to the collateral inspection platform.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert title={error.title}>
                {error.hint}
                {error.requestId && (
                  <p className="mt-1 font-mono text-[11px]">
                    Reference: {error.requestId}
                  </p>
                )}
              </Alert>
            )}

            <Field label="Email address" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                placeholder="you@institution.rw"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={submitting}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-brand-700 lg:block lg:w-[52%]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(900px 520px at 78% 12%, rgba(255,255,255,0.15), transparent 60%)," +
              "radial-gradient(700px 480px at 12% 88%, rgba(255,255,255,0.09), transparent 62%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-14">
          <p className="text-sm font-medium text-white/70">
            Smart Collateral Inspection
          </p>

          <div className="max-w-md">
            <h2 className="text-[32px] font-semibold leading-[1.15] tracking-tight text-white">
              Every inspection, evidenced and accounted for.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">
              Field capture with GPS and photographic evidence, supervisory
              review with separation of duties, and an official report backed by
              a complete audit trail.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ["Offline-first", "Inspectors work without signal"],
              ["Proof of presence", "GPS verified against the property"],
              ["Fully audited", "Every decision traceable"],
            ].map(([title, detail]) => (
              <div
                key={title}
                className="rounded-xl bg-white/10 p-3.5 backdrop-blur-sm"
              >
                <p className="text-xs font-semibold text-white">{title}</p>
                <p className="mt-1 text-2xs leading-relaxed text-white/60">
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
