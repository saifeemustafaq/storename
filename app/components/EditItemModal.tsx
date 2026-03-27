"use client";

import { useState } from "react";
import type { Ingredient } from "../actions";

export default function EditItemModal({
  item,
  onClose,
  onSave,
  onDelete,
  isPending,
}: {
  item: Ingredient;
  onClose: () => void;
  onSave: (
    id: number,
    data: { originalName: string; name: string; store: string }
  ) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}) {
  const [originalName, setOriginalName] = useState(item.originalName);
  const [name, setName] = useState(item.name);
  const [store, setStore] = useState(item.store);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const hasChanges =
    originalName !== item.originalName ||
    name !== item.name ||
    store !== item.store;

  const handleSave = () => {
    if (!hasChanges) return;
    onSave(item.id, { originalName, name, store });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/10">
          <div>
            <h2 className="text-base font-semibold">Edit Ingredient</h2>
            <span className="text-xs text-black/30 font-mono">
              #{item.id}
            </span>
          </div>
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

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] text-black/45 uppercase tracking-wider font-medium mb-1.5">
              Original Name
            </label>
            <input
              type="text"
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-black/15 rounded-md bg-white text-black focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] text-black/45 uppercase tracking-wider font-medium mb-1.5">
              Corrected Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-black/15 rounded-md bg-white text-black focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] text-black/45 uppercase tracking-wider font-medium mb-1.5">
              Store
            </label>
            <input
              type="text"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-black/15 rounded-md bg-white text-black focus:outline-none focus:border-black/40 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-black/10 bg-black/[0.02]">
          <div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-black/50">Are you sure?</span>
                <button
                  onClick={() => onDelete(item.id)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-30"
                >
                  {isPending ? "Deleting..." : "Yes, delete"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-1.5 text-xs border border-black/15 rounded-md hover:border-black/40 transition-colors cursor-pointer text-black/50"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                title="Delete"
                className="text-black/25 hover:text-black transition-colors cursor-pointer p-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-black/15 rounded-md hover:border-black/40 transition-colors cursor-pointer text-black/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !hasChanges}
              className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer disabled:opacity-30"
            >
              {isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
