"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Chrome,
  Puzzle,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  Download,
  Package,
  LayoutDashboard,
} from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: Download,
    title: "Downloading extension…",
    doneTitle: "Extension downloaded!",
    color: "blue",
  },
  {
    id: 2,
    icon: Package,
    title: "Unzip the file",
    color: "violet",
  },
  {
    id: 3,
    icon: Chrome,
    title: "Open Chrome Extensions",
    color: "orange",
  },
  {
    id: 4,
    icon: FolderOpen,
    title: "Load the extension",
    color: "teal",
  },
  {
    id: 5,
    icon: LayoutDashboard,
    title: "You're all set!",
    color: "green",
  },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  // Auto-download the extension zip as soon as the page loads
  useEffect(() => {
    const timer = setTimeout(() => {
      const a = document.createElement("a");
      a.href = "/linkedfollow-extension-v2.zip";
      a.download = "linkedfollow-extension-v2.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setAutoDownloaded(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Auto-advance step 1 → 2 after download
  useEffect(() => {
    if (autoDownloaded && currentStep === 1) {
      const t = setTimeout(() => setCurrentStep(2), 1200);
      return () => clearTimeout(t);
    }
  }, [autoDownloaded, currentStep]);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, 5));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center px-4 py-10">

      {/* Logo + heading */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-bold text-xl">LF</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set up LinkedFollow</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Follow the steps below to install your extension</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-6">
        <div className="flex items-center gap-1.5">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  step.id <= currentStep ? "bg-blue-500" : "bg-gray-200 dark:bg-gray-800"
                }`}
              />
              {i < STEPS.length - 1 && <div className="w-1" />}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-right">Step {currentStep} of {STEPS.length}</p>
      </div>

      {/* Step cards */}
      <div className="w-full max-w-md">

        {/* ── Step 1: Downloading ── */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 text-center shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {autoDownloaded
                ? <CheckCircle className="w-8 h-8 text-green-500" />
                : <Download className="w-8 h-8 text-blue-600 animate-bounce" />}
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {autoDownloaded ? "Downloaded! ✓" : "Downloading…"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {autoDownloaded
                ? "linkedfollow-extension-v2.zip is in your Downloads folder."
                : "Your extension zip is being saved to your Downloads folder."}
            </p>
            {autoDownloaded && (
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!autoDownloaded && (
              <a
                href="/linkedfollow-extension-v2.zip"
                download="linkedfollow-extension-v2.zip"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Download manually
              </a>
            )}
          </div>
        )}

        {/* ── Step 2: Unzip ── */}
        {currentStep === 2 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-violet-200 dark:border-violet-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-violet-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">Unzip the file</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
              Find <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">linkedfollow-extension-v2.zip</code> in your Downloads and double-click to unzip it.
            </p>

            {/* Visual hint */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-5 flex items-center gap-3">
              <div className="text-3xl">📁</div>
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">You'll get a folder:</p>
                <code className="text-sm font-bold text-violet-700 dark:text-violet-300">linkedfollow-extension-v2</code>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
              <div className="text-3xl">📂</div>
            </div>

            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-5">
              <Puzzle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Keep the folder somewhere easy to find — you'll need it in the next step.</span>
            </div>

            <button
              onClick={goNext}
              className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Done, I unzipped it <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 3: Open Chrome Extensions ── */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-orange-200 dark:border-orange-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Chrome className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">Open Chrome Extensions</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
              Click the button below — it opens Chrome's extension manager directly.
            </p>

            {/* Steps visual */}
            <div className="space-y-2.5 mb-5">
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">Click <strong className="text-gray-800 dark:text-gray-200">&quot;Open chrome://extensions →&quot;</strong> below</p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 bg-orange-500 text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">Toggle on <strong className="text-gray-800 dark:text-gray-200">Developer mode</strong> in the <strong>top-right corner</strong></p>
              </div>
              {/* Visual callout for the toggle */}
              <div className="ml-8 flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
                <div className="w-8 h-4 bg-orange-400 rounded-full flex items-center justify-end pr-0.5">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
                <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">Developer mode → ON</span>
              </div>
            </div>

            <a
              href="/open-extensions.html"
              target="_blank"
              rel="noopener"
              onClick={goNext}
              className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors mb-3"
            >
              <ExternalLink className="w-4 h-4" />
              Open chrome://extensions →
            </a>
            <button
              onClick={goNext}
              className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1"
            >
              Already done → Next step
            </button>
          </div>
        )}

        {/* ── Step 4: Load unpacked ── */}
        {currentStep === 4 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-teal-200 dark:border-teal-800 p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 text-center">Load the extension</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-5">
              In the Chrome Extensions page, click <strong>&quot;Load unpacked&quot;</strong> and select your folder.
            </p>

            {/* Steps visual */}
            <div className="space-y-2.5 mb-5">
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-500 text-white rounded-full text-xs font-bold flex items-center justify-center">1</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Click the <strong className="text-gray-800 dark:text-gray-200">&quot;Load unpacked&quot;</strong> button (appears after Dev mode is on)
                </p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-500 text-white rounded-full text-xs font-bold flex items-center justify-center">2</span>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Select the <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded font-bold text-teal-700 dark:text-teal-300">linkedfollow-extension-v2</code> folder
                </div>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                <span className="flex-shrink-0 w-5 h-5 bg-teal-500 text-white rounded-full text-xs font-bold flex items-center justify-center">3</span>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  The <strong className="text-gray-800 dark:text-gray-200">LinkedFollow</strong> card will appear — you're done!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-2 mb-5">
              <Puzzle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Select the <strong>folder itself</strong> — not any file inside it.</span>
            </div>

            <button
              onClick={goNext}
              className="w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Extension loaded! <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── Step 5: All done ── */}
        {currentStep === 5 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border-2 border-green-300 dark:border-green-700 p-6 text-center shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-950 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">You're all set! 🎉</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              LinkedFollow is installed and ready. It automatically detects your account — just visit any LinkedIn profile and send a message.
            </p>

            {/* What happens next */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">What happens now</p>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="text-green-500">✓</span> Visit a LinkedIn profile
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="text-green-500">✓</span> Send a message — it's tracked automatically
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                <span className="text-green-500">✓</span> Check your dashboard to see all activity
              </div>
            </div>

            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Back link for non-first steps */}
      {currentStep > 1 && currentStep < 5 && (
        <button
          onClick={() => setCurrentStep((s) => Math.max(s - 1, 1))}
          className="mt-4 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← Back
        </button>
      )}

      {/* Skip link */}
      {currentStep < 5 && (
        <Link
          href="/dashboard"
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline"
        >
          Skip for now → Go to Dashboard
        </Link>
      )}
    </div>
  );
}
