"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Fuse from "fuse.js";
import type { Ingredient } from "../actions";
import { getAllIngredients } from "../actions";

interface MatchedRow {
  raw: string;
  match: Ingredient | null;
  score: number;
  added: boolean;
}

interface Props {
  ingredients: Ingredient[];
  cart: Set<number>;
  onToggleCart: (id: number) => void;
  onBatchAdd: (ids: number[]) => void;
  onClose: () => void;
}

export default function BulkMatcher({
  ingredients,
  cart,
  onToggleCart,
  onBatchAdd,
  onClose,
}: Props) {
  const [localIngredients, setLocalIngredients] = useState(ingredients);
  const [rawText, setRawText] = useState("");
  const [rows, setRows] = useState<MatchedRow[]>([]);
  const [parsed, setParsed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fuse = useMemo(
    () =>
      new Fuse(localIngredients, {
        keys: [
          { name: "name", weight: 0.6 },
          { name: "originalName", weight: 0.4 },
        ],
        threshold: 0.4,
        includeScore: true,
      }),
    [localIngredients]
  );

  const handleMatch = useCallback(() => {
    const lines = rawText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const matched: MatchedRow[] = lines.map((line) => {
      const results = fuse.search(line);
      const top = results[0];
      if (top && top.score !== undefined && top.score <= 0.6) {
        return { raw: line, match: top.item, score: top.score, added: false };
      }
      return { raw: line, match: null, score: 1, added: false };
    });

    setRows(matched);
    setParsed(true);
  }, [rawText, fuse]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const pasted = e.clipboardData.getData("text");
      const combined = rawText + pasted;
      setRawText(combined);

      setTimeout(() => {
        const lines = combined
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        if (lines.length > 0) {
          const matched: MatchedRow[] = lines.map((line) => {
            const results = fuse.search(line);
            const top = results[0];
            if (top && top.score !== undefined && top.score <= 0.6) {
              return { raw: line, match: top.item, score: top.score, added: false };
            }
            return { raw: line, match: null, score: 1, added: false };
          });
          setRows(matched);
          setParsed(true);
        }
      }, 0);
    },
    [rawText, fuse]
  );

  const updateRowMatch = (index: number, ingredient: Ingredient) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], match: ingredient, score: 0 };
      return next;
    });
  };

  const markAdded = (index: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], added: true };
      return next;
    });
  };

  const handleAddSingle = (index: number) => {
    const row = rows[index];
    if (!row.match) return;
    onToggleCart(row.match.id);
    markAdded(index);
  };

  const handleAddAll = () => {
    const ids = rows
      .filter((r) => r.match && !r.added && !cart.has(r.match.id))
      .map((r) => r.match!.id);
    if (ids.length > 0) {
      onBatchAdd(ids);
      setRows((prev) =>
        prev.map((r) =>
          r.match && ids.includes(r.match.id) ? { ...r, added: true } : r
        )
      );
    }
  };

  const handleReset = () => {
    setRawText("");
    setRows([]);
    setParsed(false);
    textareaRef.current?.focus();
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await getAllIngredients();
      setLocalIngredients(fresh);

      if (rows.length > 0) {
        const newFuse = new Fuse(fresh, {
          keys: [
            { name: "name", weight: 0.6 },
            { name: "originalName", weight: 0.4 },
          ],
          threshold: 0.4,
          includeScore: true,
        });

        setRows((prev) =>
          prev.map((row) => {
            if (row.match !== null) return row;
            const results = newFuse.search(row.raw);
            const top = results[0];
            if (top && top.score !== undefined && top.score <= 0.6) {
              return { ...row, match: top.item, score: top.score };
            }
            return row;
          })
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, [rows]);

  const matchedCount = rows.filter((r) => r.match !== null).length;
  const addableCount = rows.filter(
    (r) => r.match && !r.added && !cart.has(r.match.id)
  ).length;

  useEffect(() => {
    if (!parsed) textareaRef.current?.focus();
  }, [parsed]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl mx-4 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <div>
            <h2 className="text-base font-semibold">Bulk Match</h2>
            <p className="text-xs text-black/40 mt-0.5">
              Paste a list of ingredients to match against your database
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh ingredients from database"
              className="text-black/30 hover:text-black transition-colors cursor-pointer p-1.5 rounded-md hover:bg-black/[0.04]"
            >
              <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-black/30 hover:text-black transition-colors cursor-pointer p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Paste area */}
        <div className="px-5 py-4 border-b border-black/10">
          <textarea
            ref={textareaRef}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            onPaste={handlePaste}
            placeholder={"Paste your ingredient list here (one per line):\n\nYellow onion\nRoma tomatoes\nFresh ginger\nCilantro\n..."}
            rows={parsed ? 3 : 8}
            className="w-full px-3 py-3 text-sm border border-black/15 rounded-lg bg-white text-black placeholder:text-black/20 focus:outline-none focus:border-black/40 transition-all resize-y font-mono"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleMatch}
              disabled={rawText.trim().length === 0}
              className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-30"
            >
              Match
            </button>
            {parsed && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm border border-black/15 rounded-md hover:border-black/40 transition-colors cursor-pointer text-black/50"
              >
                Reset
              </button>
            )}
            {parsed && (
              <span className="text-xs text-black/40 ml-auto">
                {matchedCount} of {rows.length} matched
              </span>
            )}
          </div>
        </div>

        {/* Results table */}
        {parsed && rows.length > 0 && (
          <>
            <div className="px-5 pb-3 overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table className="w-full border-collapse border border-black/15">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50">
                    <th className="border border-black/15 px-3 py-2.5 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider w-10">
                      #
                    </th>
                    <th className="border border-black/15 px-3 py-2.5 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider">
                      Pasted Item
                    </th>
                    <th className="border border-black/15 px-3 py-2.5 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider">
                      Matched Ingredient
                    </th>
                    <th className="border border-black/15 px-3 py-2.5 text-center text-[11px] font-medium text-black/50 uppercase tracking-wider w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <MatchRow
                      key={i}
                      index={i}
                      row={row}
                      ingredients={localIngredients}
                      cart={cart}
                      onUpdateMatch={updateRowMatch}
                      onAdd={handleAddSingle}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-black/10 bg-black/[0.02]">
              <span className="text-xs text-black/40">
                {rows.filter((r) => r.added || (r.match && cart.has(r.match.id))).length} of{" "}
                {rows.length} added to list
              </span>
              <button
                onClick={handleAddAll}
                disabled={addableCount === 0}
                className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-30"
              >
                {addableCount > 0
                  ? `Add All Matched (${addableCount})`
                  : "All matched items added"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MatchRow({
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
