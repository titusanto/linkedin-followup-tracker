"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Chrome,
  Puzzle,
  ArrowRight,
  ArrowDown,
  FolderOpen,
  ExternalLink,
  Download,
  ChevronLeft,
} from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [downloaded, setDownloaded] = useState(false);

  // Auto-download the extension on load
  useEffect(() => {
    const t = setTimeout(() => {
      const a = document.createElement("a");
      a.href = "/linkedfollow-extension-v2.zip";
      a.download = "linkedfollow-extension-v2.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloaded(true);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance from step 1 after download completes
  useEffect(() => {
    if (downloaded && step === 1) {
      const t = setTimeout(() => setStep(2), 1500);
      return () => clearTimeout(t);
    }
  }, [downloaded, step]);

  const next = useCallback(() => setStep((s) => Math.min(s + 1, 4)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);

  const totalSteps = 4;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white font-bold text-lg">LF</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Set up LinkedFollow</h1>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <div
              key={n}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                n <= step
                  ? "w-8 bg-blue-500"
                  : "w-4 bg-gray-200 dark:bg-gray-800"
              }`}
            />
          ))}
          <span className="text-[10px] text-gray-400 ml-1.5 tabular-nums">{step}/{totalSteps}</span>
        </div>

        {/* ── Step 1: Download ── */}
        {step === 1 && (
          <Card>
            <StepIcon color="blue">
              {downloaded
                ? <CheckCircle className="w-7 h-7 text-green-500" />
                : <Download className="w-7 h-7 text-blue-600 animate-bounce" />
              }
            </StepIcon>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">
              {downloaded ? "Downloaded!" : "Downloading…"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
              {downloaded
                ? "Check your Downloads folder for the zip file."
                : "Saving extension to your Downloads…"
              }
            </p>

            {downloaded && (
              <div className="mt-5 flex flex-col items-center gap-3">
                <ArrowDown className="w-5 h-5 text-blue-400 animate-bounce" />
                <p className="text-xs text-gray-400">Advancing to next step…</p>
              </div>
            )}

            {!downloaded && (
              <a
                href="/linkedfollow-extension-v2.zip"
                download="linkedfollow-extension-v2.zip"
                className="mt-4 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
              >
                <Download className="w-3 h-3" /> Download manually
              </a>
            )}
          </Card>
        )}

        {/* ── Step 2: Unzip & Open Extensions ── */}
        {step === 2 && (
          <Card>
            <StepIcon color="purple">
              <Chrome className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </StepIcon>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">
              Unzip &amp; open Extensions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-4">
              Two quick things before we load it:
            </p>

            <ol className="space-y-3 mb-5">
              <SubStep n={1}>
                <strong>Unzip</strong> the downloaded file — double-click{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[11px]">linkedfollow-extension-v2.zip</code>
              </SubStep>
              <SubStep n={2}>
                Open <strong>Chrome Extensions</strong> using the button below
              </SubStep>
              <SubStep n={3}>
                Turn on <strong>Developer mode</strong> (top-right toggle)
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="w-7 h-3.5 bg-blue-500 rounded-full flex items-center justify-end pr-0.5">
                    <div className="w-2.5 h-2.5 bg-white rounded-full" />
                  </div>
                  <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">ON</span>
                </div>
              </SubStep>
            </ol>

            <a
              href="/open-extensions.html"
              target="_blank"
              rel="noopener"
              className="w-full inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors mb-2"
              onClick={next}
            >
              <ExternalLink className="w-4 h-4" />
              Open chrome://extensions
            </a>
            <button onClick={next} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5">
              Already open → Next
            </button>
          </Card>
        )}

        {/* ── Step 3: Load unpacked ── */}
        {step === 3 && (
          <Card>
            <StepIcon color="teal">
              <FolderOpen className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </StepIcon>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white text-center">
              Load the extension
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-4">
              In Chrome&apos;s extension page:
            </p>

            <ol className="space-y-3 mb-5">
              <SubStep n={1}>
                Click <strong>&quot;Load unpacked&quot;</strong>
              </SubStep>
              <SubStep n={2}>
                Navigate to and select the{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-[11px] font-bold text-teal-700 dark:text-teal-300">linkedfollow-extension-v2</code>{" "}
                folder
              </SubStep>
              <SubStep n={3}>
                You&apos;ll see the <strong>LinkedFollow</strong> card appear — that means it&apos;s installed!
              </SubStep>
            </ol>

            <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-5">
              <Puzzle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Select the <strong>folder</strong> itself — not a file inside it.</span>
            </div>

            <button
              onClick={next}
              className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Done — it&apos;s installed! <ArrowRight className="w-4 h-4" />
            </button>
          </Card>
        )}

        {/* ── Step 4: All set! ── */}
        {step === 4 && (
          <Card>
            <div className="w-14 h-14 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">
              You&apos;re all set!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1 mb-5">
              No extra setup needed — the extension auto-connects to your account.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5 space-y-2.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">How it works</p>
              <HowItWorksItem emoji="🔗" text="Visit any LinkedIn profile" />
              <HowItWorksItem emoji="💬" text="Send a message — tracked automatically" />
              <HowItWorksItem emoji="📊" text="See everything in your dashboard" />
            </div>

            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </Card>
        )}

        {/* Back + Skip */}
        <div className="flex items-center justify-between mt-4 px-1">
          {step > 1 && step < 4 ? (
            <button onClick={back} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <ChevronLeft className="w-3 h-3" /> Back
            </button>
          ) : <span />}

          {step < 4 && (
            <Link
              href="/dashboard"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline"
            >
              Skip → Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Small reusable components ──────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      {children}
    </div>
  );
}

function StepIcon({ color, children }: { color: string; children: React.ReactNode }) {
  const bgMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-950",
    purple: "bg-purple-50 dark:bg-purple-950",
    teal: "bg-teal-50 dark:bg-teal-950",
    green: "bg-green-50 dark:bg-green-950",
  };
  return (
    <div className={`w-14 h-14 ${bgMap[color] || bgMap.blue} rounded-2xl flex items-center justify-center mx-auto mb-3`}>
      {children}
    </div>
  );
}

function SubStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-shrink-0 w-5 h-5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{children}</span>
    </li>
  );
}

function HowItWorksItem({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300">
      <span className="text-base">{emoji}</span> {text}
    </div>
  );
}
