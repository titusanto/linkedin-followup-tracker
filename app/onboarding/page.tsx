"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Chrome,
  Puzzle,
  Link2,
  ArrowRight,
  FolderOpen,
  ExternalLink,
  Download,
} from "lucide-react";

export default function OnboardingPage() {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  // Auto-download the extension zip as soon as the page loads — no click needed
  useEffect(() => {
    const timer = setTimeout(() => {
      const a = document.createElement("a");
      a.href = "/linkedfollow-extension-v2.zip";
      a.download = "linkedfollow-extension-v2.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setAutoDownloaded(true);
      setCompletedSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]));
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  function toggleStep(n: number) {
    setCompletedSteps((prev) =>
      prev.includes(n) ? prev.filter((s) => s !== n) : [...prev, n]
    );
  }

  const allDone = completedSteps.length >= 4;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-12">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-xl">LF</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Install the Extension</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {autoDownloaded ? "✓ Download started — follow the 4 steps below" : "Starting download…"}
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-3">

          {/* Step 1 — auto done */}
          <div
            onClick={() => toggleStep(1)}
            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              completedSteps.includes(1)
                ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              completedSteps.includes(1) ? "bg-green-500 text-white" : "bg-blue-50 dark:bg-blue-950 text-blue-600"
            }`}>
              {completedSteps.includes(1) ? <CheckCircle className="w-5 h-5" /> : <Download className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-gray-400">Step 1</span>
                {completedSteps.includes(1) && <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Done</span>}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                {autoDownloaded ? "Extension downloaded!" : "Downloading extension…"}
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                Unzip it — you&apos;ll get a folder called{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">linkedfollow-extension-v2</code>.
                <br />
                <a
                  href="/linkedfollow-extension-v2.zip"
                  download="linkedfollow-extension-v2.zip"
                  className="inline-flex items-center gap-1 mt-1.5 text-blue-600 hover:underline font-medium"
                >
                  <Download className="w-3 h-3" /> Download again if needed
                </a>
              </div>
            </div>
          </div>

          {/* Step 2 — direct link button */}
          <div
            onClick={() => toggleStep(2)}
            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              completedSteps.includes(2)
                ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300"
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              completedSteps.includes(2) ? "bg-green-500 text-white" : "bg-blue-50 dark:bg-blue-950 text-blue-600"
            }`}>
              {completedSteps.includes(2) ? <CheckCircle className="w-5 h-5" /> : <Chrome className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-gray-400">Step 2</span>
                {completedSteps.includes(2) && <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Done</span>}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Open Chrome Extensions &amp; enable Developer Mode</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                Click the button below — it takes you directly there. Then turn on the <strong>Developer mode</strong> toggle (top-right corner).
                <br />
                <a
                  href="/open-extensions.html"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                  onClick={(e) => { e.stopPropagation(); if (!completedSteps.includes(2)) toggleStep(2); }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open chrome://extensions →
                </a>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => toggleStep(3)}
            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              completedSteps.includes(3)
                ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300"
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              completedSteps.includes(3) ? "bg-green-500 text-white" : "bg-blue-50 dark:bg-blue-950 text-blue-600"
            }`}>
              {completedSteps.includes(3) ? <CheckCircle className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-gray-400">Step 3</span>
                {completedSteps.includes(3) && <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Done</span>}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Load the extension folder</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Click <strong>&ldquo;Load unpacked&rdquo;</strong> and select the{" "}
                <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">linkedfollow-extension-v2</code> folder.
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-2.5 py-1.5">
                  <Puzzle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Select the <strong>folder</strong> itself — not a file inside it.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div
            onClick={() => toggleStep(4)}
            className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
              completedSteps.includes(4)
                ? "border-green-400 bg-green-50 dark:bg-green-950/30"
                : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300"
            }`}
          >
            <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
              completedSteps.includes(4) ? "bg-green-500 text-white" : "bg-blue-50 dark:bg-blue-950 text-blue-600"
            }`}>
              {completedSteps.includes(4) ? <CheckCircle className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-medium text-gray-400">Step 4</span>
                {completedSteps.includes(4) && <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">✓ Done</span>}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Connect — just paste your User ID</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed" onClick={(e) => e.stopPropagation()}>
                Click the <strong>LinkedFollow icon</strong> in your Chrome toolbar.
                Only your <strong>User ID</strong> is needed — the URL and API secret are already built in.
                <br />
                <Link
                  href="/dashboard/settings"
                  target="_blank"
                  className="inline-flex items-center gap-1 mt-1.5 text-blue-600 hover:underline font-medium"
                >
                  Get your User ID from Settings <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* User ID helper */}
        <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">🔑 Where&apos;s my User ID?</p>
          <p className="text-xs text-blue-700 dark:text-blue-400 mb-3">
            Open Settings — your User ID has a one-click copy button. Just paste it in the extension popup. No other credentials needed.
          </p>
          <Link
            href="/dashboard/settings"
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
          >
            Open Settings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* All done */}
        {allDone && (
          <div className="mt-5 p-5 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-2xl text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-semibold text-green-900 dark:text-green-200">You&apos;re all set! 🎉</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1 mb-4">
              Visit any LinkedIn profile and click Connect, Message, or Follow — it saves automatically.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Skip */}
        {!allDone && (
          <div className="mt-5 text-center">
            <Link
              href="/dashboard"
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:underline"
            >
              Skip for now → Go to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
