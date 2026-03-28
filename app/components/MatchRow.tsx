"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import type { Ingredient } from "../actions";

export interface MatchedRow {
  raw: string;
  match: Ingredient | null;
  score: number;
  added: boolean;
}

export default function MatchRow({
  index,
  row,
  ingredients,
  cart,
  onUpdateMatch,
  onAdd,
}: {
  index: number;
  row: MatchedRow;
  ingredients: Ingredient[];
  cart: Set<number>;
  onUpdateMatch: (index: number, ingredient: Ingredient) => void;
  onAdd: (index: number) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const inCart = row.match ? cart.has(row.match.id) || row.added : false;

  useEffect(() => {
    if (dropdownOpen) {
      searchInputRef.current?.focus();
    }
  }, [dropdownOpen]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setSearch("");
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ingredients;
    const q = search.toLowerCase();
    return ingredients.filter(
      (ing) =>
        ing.name.toLowerCase().includes(q) ||
        ing.originalName.toLowerCase().includes(q)
    );
  }, [ingredients, search]);

  const scoreColor =
    row.score <= 0.1
      ? "text-emerald-600"
      : row.score <= 0.3
        ? "text-amber-600"
        : row.score <= 0.6
          ? "text-orange-600"
          : "text-red-500";

  return (
    <tr className={`hover:bg-black/[0.02] transition-colors ${index % 2 === 1 ? "bg-black/[0.015]" : ""}`}>
      <td className="border border-black/10 px-3 py-2.5 font-mono text-sm text-black/25 tabular-nums text-center">
        {index + 1}
      </td>
      <td className="border border-black/10 px-3 py-2.5 text-sm text-black">
        {row.raw}
      </td>
      <td className="border border-black/10 px-3 py-2.5 relative">
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={`text-sm text-left w-full flex items-center gap-2 cursor-pointer hover:underline underline-offset-2 ${
              row.match ? "text-black" : "text-black/30 italic"
            }`}
          >
            <span className="flex-1 truncate">
              {row.match ? row.match.name : "No match — click to search"}
            </span>
            {row.match && (
              <span className={`text-[10px] font-mono shrink-0 ${scoreColor}`}>
                {Math.round((1 - row.score) * 100)}%
              </span>
            )}
            <svg
              className="w-3.5 h-3.5 text-black/25 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-black/15 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-black/10">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ingredients..."
                  className="w-full px-2.5 py-2 text-sm border border-black/15 rounded-md bg-white text-black placeholder:text-black/25 focus:outline-none focus:border-black/40"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDropdownOpen(false);
                      setSearch("");
                    }
                    if (e.key === "Enter" && filtered.length > 0) {
                      onUpdateMatch(index, filtered[0]);
                      setDropdownOpen(false);
                      setSearch("");
                    }
                  }}
                />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-black/30">
                    No ingredients found
                  </div>
                ) : (
                  filtered.map((ing) => (
                    <button
                      key={ing.id}
                      onClick={() => {
                        onUpdateMatch(index, ing);
                        setDropdownOpen(false);
                        setSearch("");
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-black/[0.04] transition-colors cursor-pointer border-b border-black/[0.05] last:border-0 ${
                        row.match?.id === ing.id ? "bg-black/[0.04] font-medium" : ""
                      }`}
                    >
                      <span className="block text-black">{ing.name}</span>
                      {ing.name !== ing.originalName && (
                        <span className="block text-[11px] text-black/30 mt-0.5">
                          {ing.originalName}
                        </span>
                      )}
                      <span className="block text-[10px] text-black/25 mt-0.5">
                        {ing.store}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </td>
      <td className="border border-black/10 px-3 py-2.5 text-center">
        {row.match ? (
          <button
            onClick={() => onAdd(index)}
            disabled={inCart}
            title={inCart ? "Already in list" : "Add to list"}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all cursor-pointer ${
              inCart
                ? "bg-black text-white border-black"
                : "bg-white text-black/40 border-black/15 hover:border-black/40 hover:text-black"
            }`}
          >
            {inCart ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        ) : (
          <span className="text-[10px] text-black/20">—</span>
        )}
      </td>
    </tr>
  );
}
