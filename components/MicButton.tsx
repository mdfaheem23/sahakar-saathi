"use client";

import { Mic, MicOff } from "lucide-react";

export default function MicButton({
  listening,
  supported,
  onToggle,
  size = "md",
}: {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  size?: "md" | "lg";
}) {
  const dims = size === "lg" ? "h-16 w-16" : "h-10 w-10";
  const iconSize = size === "lg" ? 26 : 18;

  return (
    <button
      onClick={onToggle}
      disabled={!supported}
      title={supported ? "Voice input" : "Voice input not supported in this browser"}
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full border transition-colors ${
        listening
          ? "mic-listening border-clay-500 bg-clay-500 text-white"
          : "border-line bg-white text-forest-600 hover:border-forest-600"
      } ${!supported ? "cursor-not-allowed opacity-40" : ""}`}
    >
      {supported ? <Mic size={iconSize} /> : <MicOff size={iconSize} className="opacity-70" />}
    </button>
  );
}
