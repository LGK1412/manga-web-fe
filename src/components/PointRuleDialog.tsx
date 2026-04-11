"use client";

import { HelpCircle } from "lucide-react";

export default function PointRuleDialog() {
  return (
    <div className="group relative flex items-center">
      <HelpCircle className="h-4 w-4 text-slate-400 cursor-help hover:text-blue-500 transition-colors" />

      <div
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 
      bg-white text-slate-700 text-[11px] leading-relaxed 
      rounded-lg shadow-xl border border-slate-200
      opacity-0 invisible group-hover:opacity-100 group-hover:visible 
      transition-all z-30 pointer-events-none"
      >
        <p className="font-semibold border-b border-slate-200 pb-1 mb-1.5 text-blue-600">
          Monetization Rules:
        </p>

        <ul className="space-y-1.5 list-none">
          <li>
            • <span className="text-emerald-600 font-medium">0 Points:</span>{" "}
            Chapter is free for everyone.
          </li>
          <li>
            • <span className="text-amber-600 font-medium">&gt; 0 Points:</span>{" "}
            Users must pay the specified amount to unlock.
          </li>
          <li>
            • <span className="text-blue-600 font-medium">Earnings:</span>{" "}
            Points spent by users are converted into{" "}
            <strong>Author Points</strong>.
          </li>
        </ul>
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 
        border-8 border-transparent border-t-white 
        drop-shadow-sm"
        ></div>
      </div>
    </div>
  );
}
