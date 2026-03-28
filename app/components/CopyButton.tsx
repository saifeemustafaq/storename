"use client";

import { useState, useRef, useEffect } from "react";
import type { Ingredient } from "../actions";

export default function CopyButton({ items }: { items: Ingredient[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
    setOpen(false);
  };

  const copyAll = () => {
    const header = "#\tIngredient\tOriginal Name\tStore";
    const rows = items.map(
      (i) => `${i.id}\t${i.name}\t${i.originalName}\t${i.store}`
    );
    copyToClipboard([header, ...rows].join("\n"), "All");
  };

  const copyColumn = (
    key: "name" | "originalName" | "store",
    label: string
  ) => {
    copyToClipboard(items.map((i) => i[key]).join("\n"), label);
  };

  const options: { label: string; action: () => void }[] = [
    { label: "Copy All", action: copyAll },
    { label: "Copy Ingredient", action: () => copyColumn("name", "Ingredient") },
    { label: "Copy Original Name", action: () => copyColumn("originalName", "Original Name") },
    { label: "Copy Store", action: () => copyColumn("store", "Store") },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
          copied
            ? "bg-black text-white border-black"
            : "border-black/15 text-black/70 hover:border-black/40 hover:text-black"
        }`}
      >
        {copied ? (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )}
        {copied ? `Copied ${copied}` : "Copy"}
        {!copied && (
          <svg
            className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-black/15 rounded-lg shadow-lg z-50 overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.action}
              className="w-full text-left px-3 py-2.5 text-xs text-black/70 hover:bg-black/[0.04] hover:text-black transition-colors cursor-pointer"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
