"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

const colors = {
  night: "#0d0715",
  neonPink: "#ff2ea6",
  neonBlue: "#4ad5ff",
  panel: "rgba(16, 8, 25, 0.8)",
};

type Mode = "login" | "register";

const registerFields = [
  { id: "email", label: "Email", type: "email", placeholder: "player@arena.gg" },
  { id: "username", label: "Username", type: "text", placeholder: "ArcRunner" },
  { id: "password", label: "Password", type: "password", placeholder: "••••••••" },
] as const;

const loginFields = [
  {
    id: "identifier",
    label: "Email or Username",
    type: "text",
    placeholder: "player@arena.gg or ArcRunner",
  },
  { id: "password", label: "Password", type: "password", placeholder: "••••••••" },
] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("register");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [token, setToken] = useState("");

  const supabase = useMemo(() => createClient(), []);

  const ctaCopy = useMemo(
    () => (mode === "register" ? "Create account" : "Log in"),
    [mode],
  );

  const usernameFromSession =
    (sessionUser?.user_metadata as { username?: string })?.username ||
    sessionUser?.email?.split("@")[0] ||
    "Player";

  const generateToken = () => {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
    }
    return Math.random().toString(36).slice(2, 26);
  };

  const syncToken = async (
    method: "PUT" | "POST",
    tokenValue: string,
    userId: string,
  ) => {
    try {
      const response = await fetch("http://localhost:5000/api/v1/token", {
        method,
        headers: { "Content-Type": "application/json", "X-Api-Key": process.env.NEXT_PUBLIC_BACKEND_API_KEY! },
        body: JSON.stringify({ token: tokenValue, user_id: userId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to sync token.");
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to sync token. Try again.",
      );
    }
  };

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSessionUser(data.session?.user ?? null);
      })
      .catch(() => setSessionUser(null));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      if (!session?.user) {
        setToken("");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (sessionUser && !token) {
      const nextToken = generateToken();
      setToken(nextToken);
      void syncToken("PUT", nextToken, sessionUser.id);
    }
  }, [sessionUser, token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            email: (formData.get("email") as string) || "",
            username: (formData.get("username") as string) || "",
            password: (formData.get("password") as string) || "",
          }
        : {
            identifier: (formData.get("identifier") as string) || "",
            password: (formData.get("password") as string) || "",
          };

    const endpoint = `/auth/${mode}`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Request failed");
      }

      const data = await response.json();
      setStatus(data?.message || `Sent to ${endpoint}`);
      if (mode === "login" && data?.user) {
        const nextToken = token || generateToken();
        setSessionUser(data.user);
        setToken(nextToken);
        await syncToken("PUT", nextToken, data.user.id);
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Something went wrong. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = async () => {
    if (!token) return;
    try {
      await navigator.clipboard.writeText(token);
      setStatus("Token copied to clipboard.");
    } catch {
      setStatus("Unable to copy token.");
    }
  };

  const handleRegenerateToken = () => {
    if (!sessionUser) {
      setStatus("You need to be logged in to regenerate a token.");
      return;
    }
    const nextToken = generateToken();
    setToken(nextToken);
    setStatus("Token regenerated.");
    void syncToken("POST", nextToken, sessionUser.id);
  };

  const handleLogout = async () => {
    setLoading(true);
    setStatus(null);
    try {
      await supabase.auth.signOut();
      setSessionUser(null);
      setToken("");
      setStatus("Logged out.");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Could not log out. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white"
      style={{
        backgroundColor: colors.night,
        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
      }}
    >
      <div className="absolute inset-0">
        <Image
          src="/mainMenu.png"
          alt="Game menu color palette"
          fill
          sizes="100vw"
          className="pointer-events-none select-none object-cover opacity-25 blur-sm"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#10071c]/90 via-[#0b0718]/94 to-[#0a0414]/96" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(74,213,255,0.18),transparent_45%),radial-gradient(circle_at_75%_60%,rgba(255,46,166,0.22),transparent_46%)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] items-center">
          <section className="space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm uppercase tracking-[0.2em] text-white/80 shadow-[0_0_25px_rgba(74,213,255,0.18)] backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-[#4ad5ff] shadow-[0_0_18px_rgba(74,213,255,0.9)]" />
              Dodge Game
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-white md:text-5xl">
              Register or log in before you enter the arena.
            </h1>
            <p className="max-w-2xl text-lg text-white/80">
              Secure your profile, sync your scores, and keep your dodges, dashes, and glow trails tied to one identity.
              Pick a side and you are seconds away from the lobby.
            </p>
          </section>

          <section className="relative rounded-[26px] border border-white/10 bg-white/5 p-8 shadow-[0_0_65px_rgba(74,213,255,0.18)] backdrop-blur">
            <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-[#4ad5ff]/10 blur-3xl" />
            <div className="absolute right-0 -top-8 h-20 w-20 rounded-full bg-[#ff2ea6]/10 blur-3xl" />
            <div className="relative space-y-8">
              {sessionUser ? (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-sm uppercase tracking-[0.2em] text-white/60">
                        Logged in
                      </p>
                      <p className="text-2xl font-semibold text-white">
                        {sessionUser.email || "player@arena.gg"}
                      </p>
                      <p className="text-lg font-semibold text-white/80">
                        {usernameFromSession}
                      </p>
                      <p className="text-sm text-white/70">
                        Your session is active. Use the token below where needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:border-[#ff2ea6]/60 hover:bg-[#ff2ea6]/15"
                    >
                      Log out
                    </button>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>Token (read-only)</span>
                      <button
                        type="button"
                        onClick={handleRegenerateToken}
                        className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:border-[#4ad5ff]/60 hover:bg-[#4ad5ff]/10"
                      >
                        Regenerate
                      </button>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={token}
                        readOnly
                        className="flex-1 rounded-xl border border-white/10 bg-[#0f0a17] px-4 py-3 font-mono text-sm text-white/90 shadow-inner shadow-[#000000]/30 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="rounded-xl bg-gradient-to-r from-[#ff2ea6] to-[#4ad5ff] px-4 py-3 text-sm font-semibold text-[#0c0412] shadow-[0_10px_40px_-20px_rgba(255,46,166,0.6)] transition hover:-translate-y-px"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-white/10 p-1.5">
                    {(["login", "register"] as Mode[]).map((value) => (
                      <button
                        key={value}
                        onClick={() => {
                          setMode(value);
                          setStatus(null);
                        }}
                        className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          mode === value
                            ? "bg-gradient-to-r from-[#ff2ea6] to-[#4ad5ff] text-[#0c0412] shadow-[0_0_25px_rgba(255,46,166,0.3),0_0_30px_rgba(74,213,255,0.25)]"
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        {value === "login" ? "Login" : "Register"}
                      </button>
                    ))}
                  </div>

                  <form className="space-y-4" onSubmit={handleSubmit}>
                    {(mode === "register" ? registerFields : loginFields).map((field) => (
                      <label
                        key={field.id}
                        className="group block space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-[#ff2ea6]/50 hover:shadow-[0_0_25px_rgba(255,46,166,0.2)]"
                      >
                        <span className="flex items-center justify-between text-sm font-semibold text-white/80">
                          {field.label}
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                            {mode === "register"
                              ? "Required"
                              : field.id === "identifier"
                                ? "Pick one"
                                : "Keep it secret"}
                          </span>
                        </span>
                        <input
                          id={`${mode}-${field.id}`}
                          name={field.id}
                          type={field.type}
                          placeholder={field.placeholder}
                          className="w-full border-0 bg-transparent text-base text-white placeholder:text-white/40 focus:outline-none"
                          required
                        />
                      </label>
                    ))}

                    <button
                      type="submit"
                      disabled={loading}
                      className={`relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-[#ff2ea6] via-[#ff2ea6] to-[#4ad5ff] px-4 py-3 text-lg font-semibold text-[#0c0412] shadow-[0_20px_80px_-20px_rgba(255,46,166,0.45)] transition hover:-translate-y-px hover:shadow-[0_20px_95px_-18px_rgba(255,46,166,0.55)] ${
                        loading ? "opacity-70" : ""
                      }`}
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.4),transparent_35%)] opacity-40" />
                      <span className="relative">
                        {loading ? "Sending..." : ctaCopy}
                      </span>
                    </button>
                  </form>
                </>
              )}

              {status && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  {status}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
