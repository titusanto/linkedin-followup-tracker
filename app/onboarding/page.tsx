"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle,
  Chrome,
  Puzzle,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  Download,
  Sparkles,
  ChevronRight,
  ToggleRight,
  Upload,
  X,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Step 1: Auto-download extension zip ─────────────────────────────────
  const triggerDownload = useCallback(() => {
    if (downloaded) return;
    setDownloading(true);
    const a = document.createElement("a");
    a.href = "/linkedfollow-extension-v2.zip";
    a.download = "linkedfollow-extension-v2.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      setDownloading(false);
      setDownloaded(true);
      // Auto-advance to step 2 after a brief pause
      setTimeout(() => setCurrentStep(2), 800);
    }, 1200);
  }, [downloaded]);

  // Auto-download on page load
  useEffect(() => {
    const timer = setTimeout(triggerDownload, 600);
    return () => clearTimeout(timer);
  }, [triggerDownload]);

  // ── Navigation helpers ──────────────────────────────────────────────────
  function goToStep(step: Step) {
    setCurrentStep(step);
  }

  function handleExtensionInstalled() {
    setShowSuccess(true);
    // Auto-redirect to dashboard after 3s
    setTimeout(() => router.push("/dashboard"), 3000);
  }

  // ── Progress bar ────────────────────────────────────────────────────────
  const progress = ((currentStep - 1) / 3) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:py-12">
      <div className="max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-white font-bold text-xl">LF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Set Up LinkedFollow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            4 quick steps to start tracking your LinkedIn activity
          </p>
        </div>

        {/* ── Progress Bar ── */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                  step < currentStep
                    ? "bg-green-500 text-white"
                    : step === currentStep
                    ? "bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-950"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400"
                }`}
              >
                {step < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* ═══ Step 1: Download ═══ */}
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Step 1 of 4</p>
                  <h2 className="font-bold text-gray-900 dark:text-white">Download Extension</h2>
                </div>
              </div>

              {downloading ? (
                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Downloading extension…
                  </span>
                </div>
              ) : downloaded ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/40 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Download started! Moving to next step…
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    The extension file will download automatically.
                  </p>
                  <button
                    onClick={triggerDownload}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Extension
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ Step 2: Open Chrome Extensions ═══ */}
        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Chrome className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Step 2 of 4</p>
                  <h2 className="font-bold text-gray-900 dark:text-white">Unzip &amp; Open Chrome Extensions</h2>
                </div>
              </div>

              <div className="space-y-4">
                {/* Unzip instruction */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">1</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Unzip the downloaded file</strong>
                    <br />
                    <span className="text-xs">
                      You&apos;ll get a folder called{" "}
                      <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
                        linkedfollow-extension-v2
                      </code>
                    </span>
                  </div>
                </div>

                {/* Open extensions */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-blue-600">2</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">Open Chrome Extensions page</strong>
                    <br />
                    <span className="text-xs">Click the button below to go there directly</span>
                  </div>
                </div>

                <a
                  href="/open-extensions.html"
                  target="_blank"
                  rel="noopener"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open chrome://extensions
                </a>

                <button
                  onClick={() => goToStep(3)}
                  className="w-full flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors border border-blue-200 dark:border-blue-800"
                >
                  I&apos;ve opened it
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Re-download hint */}
            <div className="mt-3 text-center">
              <a
                href="/linkedfollow-extension-v2.zip"
                download="linkedfollow-extension-v2.zip"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                <Download className="w-3 h-3" /> Re-download extension if needed
              </a>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Enable Developer Mode & Load Extension ═══ */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center">
                  <Puzzle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Step 3 of 4</p>
                  <h2 className="font-bold text-gray-900 dark:text-white">Install the Extension</h2>
                </div>
              </div>

              <div className="space-y-3">
                {/* Developer Mode */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <div className="w-6 h-6 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ToggleRight className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">
                      Enable Developer Mode
                    </strong>
                    <br />
                    <span className="text-xs">
                      Toggle the switch in the <strong>top-right corner</strong> of the Extensions page
                    </span>
                  </div>
                </div>

                {/* Load Unpacked */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">
                      Click &ldquo;Load unpacked&rdquo;
                    </strong>
                    <br />
                    <span className="text-xs">
                      Button appears in the top-left after enabling Developer Mode
                    </span>
                  </div>
                </div>

                {/* Select folder */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FolderOpen className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong className="text-gray-900 dark:text-white">
                      Select the extension folder
                    </strong>
                    <br />
                    <span className="text-xs">
                      Choose the{" "}
                      <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                        linkedfollow-extension-v2
                      </code>{" "}
                      folder (not a file inside it)
                    </span>
                  </div>
                </div>

                {/* Warning tip */}
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5">
                  <Puzzle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    Make sure you select the <strong>folder</strong> itself — not a .zip or a file inside it.
                  </span>
                </div>

                <button
                  onClick={() => goToStep(4)}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-colors"
                >
                  I&apos;ve loaded the extension
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => goToStep(2)}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to previous step
            </button>
          </div>
        )}

        {/* ═══ Step 4: Verify & Go to Dashboard ═══ */}
        {currentStep === 4 && !showSuccess && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-green-200 dark:border-green-800 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 dark:bg-green-950 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 dark:text-green-400">Step 4 of 4</p>
                  <h2 className="font-bold text-gray-900 dark:text-white">You&apos;re Almost Done!</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/40 rounded-xl">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                    The extension is ready to track your LinkedIn activity automatically.
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">
                    No setup needed — the extension uses your dashboard login session automatically.
                    Just visit LinkedIn and start connecting, messaging, or following people!
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Quick check:
                  </p>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Extension loaded in Chrome? Look for the <strong>LF</strong> icon in your toolbar</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Logged into this dashboard? <strong>Yes — you&apos;re here!</strong></span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Pin the extension for easy access (click puzzle icon → pin LinkedFollow)</span>
                  </div>
                </div>

                <button
                  onClick={handleExtensionInstalled}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-green-600/20"
                >
                  <Sparkles className="w-4 h-4" />
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Back button */}
            <button
              onClick={() => goToStep(3)}
              className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              ← Back to previous step
            </button>
          </div>
        )}

        {/* ═══ Success Overlay ═══ */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
              <button
                onClick={() => router.push("/dashboard")}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                You&apos;re All Set! 🎉
              </h2>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                LinkedFollow is now tracking your LinkedIn activity.
              </p>

              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1 mb-6 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                <p>💼 <strong>Connect</strong> with people → auto-tracked</p>
                <p>💬 <strong>Message</strong> someone → auto-tracked</p>
                <p>↩️ <strong>Replies</strong> from contacts → auto-detected</p>
              </div>

              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="text-xs text-gray-400 mt-3">
                Redirecting to dashboard in a moment…
              </p>
            </div>
          </div>
        )}

        {/* ── Skip link (always visible except on success) ── */}
        {!showSuccess && (
          <div className="mt-6 text-center">
            <Link
              href="/dashboard"
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline transition-colors"
            >
              Skip setup → Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
