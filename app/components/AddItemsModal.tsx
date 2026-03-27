"use client";

import { useState } from "react";

interface RowData {
  originalName: string;
  name: string;
  store: string;
}

const EMPTY_ROW: RowData = { originalName: "", name: "", store: "" };

export default function AddItemsModal({
  onClose,
  onPublish,
  isPending,
}: {
  onClose: () => void;
  onPublish: (rows: { originalName: string; name: string; store: string }[]) => void;
  isPending: boolean;
}) {
  const [rows, setRows] = useState<RowData[]>(
    Array.from({ length: 5 }, () => ({ ...EMPTY_ROW }))
  );

  const updateCell = (
    rowIndex: number,
    field: keyof RowData,
    value: string
  ) => {
    setRows((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [field]: value };
      return next;
    });
  };

  const filledRows = rows.filter(
    (r) => r.originalName.trim() || r.name.trim() || r.store.trim()
  );

  const handlePublish = () => {
    if (filledRows.length === 0) return;
    onPublish(filledRows);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <h2 className="text-base font-semibold">Add New Items</h2>
          <button
            onClick={onClose}
            className="text-black/30 hover:text-black transition-colors cursor-pointer p-1"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 overflow-x-auto">
          <table className="w-full border-collapse border border-black/15">
            <thead>
              <tr className="bg-black/[0.03]">
                <th className="border border-black/15 px-3 py-2 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider w-10">
                  #
                </th>
                <th className="border border-black/15 px-3 py-2 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider">
                  Original Name
                </th>
                <th className="border border-black/15 px-3 py-2 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider">
                  Corrected Name
                </th>
                <th className="border border-black/15 px-3 py-2 text-left text-[11px] font-medium text-black/50 uppercase tracking-wider w-44">
                  Store
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className="hover:bg-black/[0.02] transition-colors"
                >
                  <td className="border border-black/10 px-3 py-0.5 text-xs text-black/25 font-mono text-center">
                    {i + 1}
                  </td>
                  <td className="border border-black/10 p-0">
                    <input
                      type="text"
                      value={row.originalName}
                      onChange={(e) =>
                        updateCell(i, "originalName", e.target.value)
                      }
                      placeholder="e.g. maggi chicken cube"
                      className="w-full px-3 py-2.5 text-sm bg-transparent text-black placeholder:text-black/15 focus:outline-none focus:bg-black/[0.02]"
                    />
                  </td>
                  <td className="border border-black/10 p-0">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateCell(i, "name", e.target.value)}
                      placeholder="e.g. Maggi Chicken Cubes"
                      className="w-full px-3 py-2.5 text-sm bg-transparent text-black placeholder:text-black/15 focus:outline-none focus:bg-black/[0.02]"
                    />
                  </td>
                  <td className="border border-black/10 p-0">
                    <input
                      type="text"
                      value={row.store}
                      onChange={(e) => updateCell(i, "store", e.target.value)}
                      placeholder="e.g. NIB"
                      className="w-full px-3 py-2.5 text-sm bg-transparent text-black placeholder:text-black/15 focus:outline-none focus:bg-black/[0.02]"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-black/30">
            Fill in as many rows as you need. Empty rows are ignored. If you
            leave &quot;Corrected Name&quot; blank, it copies from &quot;Original
            Name&quot;.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-black/10 bg-black/[0.02]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-black/15 rounded-md hover:border-black/40 transition-colors cursor-pointer text-black/50"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={isPending || filledRows.length === 0}
            className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-30"
          >
            {isPending
              ? "Publishing..."
              : `Publish ${filledRows.length > 0 ? `(${filledRows.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
