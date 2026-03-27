"use client";

import { useState, useMemo, useRef, useEffect, useTransition, useCallback } from "react";
import type { Ingredient, DbStatus } from "../actions";
import {
  addIngredients,
  editIngredient,
  removeIngredient,
  toggleCartItem,
  clearCart,
  checkDbHealth,
} from "../actions";

type ViewMode = "list" | "table";

interface Props {
  ingredients: Ingredient[];
  stores: string[];
  initialCart: number[];
  loadError: string;
  initialDbStatus: DbStatus;
}

export default function IngredientFinder({
  ingredients: initialIngredients,
  stores: initialStores,
  initialCart,
  loadError,
  initialDbStatus,
}: Props) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [stores, setStores] = useState(initialStores);
  const [query, setQuery] = useState("");
  const [activeStores, setActiveStores] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<number>>(() => new Set(initialCart));
  const [viewingCart, setViewingCart] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Ingredient | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dbStatus, setDbStatus] = useState<DbStatus>(initialDbStatus);
  const [dbExpanded, setDbExpanded] = useState(false);

  const refreshDbStatus = useCallback(async () => {
    try {
      const status = await checkDbHealth();
      setDbStatus(status);
    } catch {
      setDbStatus((prev) => ({ ...prev, connected: false, checkedAt: new Date().toISOString() }));
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refreshDbStatus, 30_000);
    return () => clearInterval(interval);
  }, [refreshDbStatus]);

  useEffect(() => {
    setIngredients(initialIngredients);
    setStores(initialStores);
  }, [initialIngredients, initialStores]);

  useEffect(() => {
    setCart(new Set(initialCart));
  }, [initialCart]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.key === "/" &&
        document.activeElement !== inputRef.current
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setQuery("");
        setActiveStores(new Set());
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const toggleStore = (store: string) => {
    setActiveStores((prev) => {
      const next = new Set(prev);
      if (next.has(store)) next.delete(store);
      else next.add(store);
      return next;
    });
  };

  const toggleCart = (id: number) => {
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    startTransition(async () => {
      await toggleCartItem(id);
    });
  };

  const handleClearCart = () => {
    setCart(new Set());
    if (viewingCart) setViewingCart(false);
    startTransition(async () => {
      await clearCart();
    });
  };

  const clearAll = () => {
    setQuery("");
    setActiveStores(new Set());
    inputRef.current?.focus();
  };

  const handleViewToggle = () => {
    setViewingCart((prev) => !prev);
    setQuery("");
    setActiveStores(new Set());
  };

  const sourceList = viewingCart
    ? ingredients.filter((item) => cart.has(item.id))
    : ingredients;

  const visibleStores = useMemo(() => {
    if (!viewingCart) return stores;
    const s = new Set(sourceList.map((i) => i.store));
    return Array.from(s).sort();
  }, [viewingCart, sourceList, stores]);

  const filtered = useMemo(() => {
    return sourceList.filter((item) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(q) ||
        item.originalName.toLowerCase().includes(q);
      const matchesStore =
        activeStores.size === 0 || activeStores.has(item.store);
      return matchesQuery && matchesStore;
    });
  }, [sourceList, query, activeStores]);

  const storeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of sourceList) {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(q) ||
        item.originalName.toLowerCase().includes(q);
      if (matchesQuery) {
        counts[item.store] = (counts[item.store] || 0) + 1;
      }
    }
    return counts;
  }, [sourceList, query]);

  const hasActiveFilters = query.length > 0 || activeStores.size > 0;

  const handlePublishRows = (
    rows: { originalName: string; name: string; store: string }[]
  ) => {
    startTransition(async () => {
      const result = await addIngredients(rows);
      if (result.success && result.ingredients && result.stores) {
        setIngredients(result.ingredients);
        setStores(result.stores);
        setShowAddModal(false);
      }
    });
  };

  const handleEditSave = (
    id: number,
    data: { originalName: string; name: string; store: string }
  ) => {
    startTransition(async () => {
      const result = await editIngredient(id, data);
      if (result.success && result.ingredients && result.stores) {
        setIngredients(result.ingredients);
        setStores(result.stores);
        setEditingItem(null);
      }
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      const result = await removeIngredient(id);
      if (result.success && result.ingredients && result.stores) {
        setIngredients(result.ingredients);
        setStores(result.stores);
        setCart((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setEditingItem(null);
      }
    });
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <header className="border-b border-black/10 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Ingredients</h1>
          <div className="flex items-center gap-3">
            <DbStatusIndicator
              status={dbStatus}
              expanded={dbExpanded}
              onToggle={() => setDbExpanded((p) => !p)}
              onRefresh={refreshDbStatus}
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-black text-white rounded-md hover:bg-black/80 transition-colors cursor-pointer"
            >
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Items
            </button>
          </div>
        </div>
      </header>

      {/* Load error */}
      {loadError && (
        <div className="border-b border-black/10 bg-black/[0.02] px-4 sm:px-6 py-4">
          <div className="max-w-5xl mx-auto w-full">
            <p className="text-sm text-black/60">{loadError}</p>
          </div>
        </div>
      )}

      {/* Sticky search + filters */}
      <div className="sticky top-0 z-10 bg-white border-b border-black/10">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-4">
          {/* My List / All toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleViewToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                viewingCart
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/70 border-black/15 hover:border-black/40"
              }`}
            >
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              My List
              {cart.size > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full ${
                    viewingCart
                      ? "bg-white text-black"
                      : "bg-black text-white"
                  }`}
                >
                  {cart.size}
                </span>
              )}
            </button>
            <button
              onClick={handleViewToggle}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-all cursor-pointer ${
                !viewingCart
                  ? "bg-black text-white border-black"
                  : "bg-white text-black/70 border-black/15 hover:border-black/40"
              }`}
            >
              All Ingredients
            </button>
            {cart.size > 0 && (
              <button
                onClick={handleClearCart}
                className="text-xs text-black/40 hover:text-black transition-colors cursor-pointer ml-auto"
              >
                Clear list
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                viewingCart
                  ? "Search your list..."
                  : 'Search ingredients...  press "/" to focus'
              }
              className="w-full pl-11 pr-10 py-3 text-base border border-black/15 rounded-lg bg-white text-black placeholder:text-black/25 focus:outline-none focus:border-black/40 transition-colors font-sans"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors cursor-pointer"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Store filter pills + view toggle */}
          <div className="flex items-start justify-between gap-4 mt-3">
            <div className="flex flex-wrap items-center gap-2">
              {visibleStores.map((store) => {
                const isActive = activeStores.has(store);
                const count = storeCounts[store] || 0;
                return (
                  <button
                    key={store}
                    onClick={() => toggleStore(store)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all cursor-pointer ${
                      isActive
                        ? "bg-black text-white border-black"
                        : "bg-white text-black/60 border-black/15 hover:border-black/40"
                    }`}
                  >
                    {store}
                    <span
                      className={`text-[10px] ${
                        isActive ? "text-white/50" : "text-black/25"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="text-xs text-black/35 hover:text-black underline underline-offset-2 transition-colors cursor-pointer ml-1"
                >
                  Clear
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="flex items-center border border-black/15 rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode("table")}
                title="Table view"
                className={`p-2 transition-colors cursor-pointer ${
                  viewMode === "table"
                    ? "bg-black text-white"
                    : "text-black/40 hover:text-black"
                }`}
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
                    d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z"
                  />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                title="List view"
                className={`p-2 transition-colors cursor-pointer ${
                  viewMode === "list"
                    ? "bg-black text-white"
                    : "text-black/40 hover:text-black"
                }`}
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-3">
        <div className="text-xs text-black/30 py-2 font-mono tracking-wide">
          {viewingCart
            ? filtered.length === sourceList.length
              ? `${sourceList.length} in your list`
              : `${filtered.length} of ${sourceList.length} in your list`
            : filtered.length === ingredients.length
              ? `${ingredients.length} ingredients`
              : `${filtered.length} of ${ingredients.length}`}
        </div>

        {viewingCart && cart.size === 0 ? (
          <div className="py-20 text-center text-black/30 text-base">
            <svg
              className="w-8 h-8 mx-auto mb-3 text-black/15"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Your list is empty. Add ingredients from the main view.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-black/25 text-base">
            No ingredients found
          </div>
        ) : viewMode === "list" ? (
          <ListView
            items={filtered}
            cart={cart}
            onToggleCart={toggleCart}
            onEdit={setEditingItem}
          />
        ) : (
          <TableView
            items={filtered}
            cart={cart}
            onToggleCart={toggleCart}
            onEdit={setEditingItem}
          />
        )}
      </div>

      {showAddModal && (
        <AddItemsModal
          onClose={() => setShowAddModal(false)}
          onPublish={handlePublishRows}
          isPending={isPending}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleEditSave}
          onDelete={handleDelete}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function DbStatusIndicator({
  status,
  expanded,
  onToggle,
  onRefresh,
}: {
  status: DbStatus;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
}) {
  const timeAgo = useTimeAgo(status.checkedAt);

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md border border-black/10 hover:border-black/25 transition-colors cursor-pointer"
        title={status.connected ? "MongoDB connected" : "MongoDB disconnected"}
      >
        <span className="relative flex h-2 w-2">
          {status.connected && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status.connected ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        </span>
        <span className="text-black/50 hidden sm:inline">
          {status.connected ? "Live" : "Offline"}
        </span>
      </button>

      {expanded && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-black/15 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-black/10 flex items-center justify-between">
            <span className="text-xs font-medium text-black/70">Database Status</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className="text-black/30 hover:text-black transition-colors cursor-pointer p-0.5"
              title="Refresh status"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-black/40 uppercase tracking-wider">Connection</span>
              <span className={`text-xs font-medium ${status.connected ? "text-emerald-600" : "text-red-600"}`}>
                {status.connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            {status.connected && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-black/40 uppercase tracking-wider">Database</span>
                  <span className="text-xs text-black/70 font-mono">{status.dbName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-black/40 uppercase tracking-wider">Documents</span>
                  <span className="text-xs text-black/70 font-mono">{status.ingredientCount}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-black/40 uppercase tracking-wider">Last check</span>
              <span className="text-xs text-black/50">{timeAgo}</span>
            </div>
          </div>
          <div className="px-3 py-2 border-t border-black/10 bg-black/[0.02]">
            <p className="text-[10px] text-black/30">Auto-refreshes every 30s</p>
          </div>
        </div>
      )}
    </div>
  );
}

function useTimeAgo(isoString: string) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

function AddButton({
  inCart,
  onToggle,
}: {
  inCart: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      title={inCart ? "Remove from list" : "Add to list"}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md border transition-all cursor-pointer ${
        inCart
          ? "bg-black text-white border-black hover:bg-black/70"
          : "bg-white text-black/40 border-black/15 hover:border-black/40 hover:text-black"
      }`}
    >
      {inCart ? (
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      )}
    </button>
  );
}

interface ViewProps {
  items: Ingredient[];
  cart: Set<number>;
  onToggleCart: (id: number) => void;
  onEdit: (item: Ingredient) => void;
}

function ListView({ items, cart, onToggleCart, onEdit }: ViewProps) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-black/10 text-xs text-black/35 uppercase tracking-wider">
          <th className="text-left py-2.5 pr-4 font-medium w-12">#</th>
          <th className="text-left py-2.5 pr-4 font-medium">Ingredient</th>
          <th className="text-left py-2.5 font-medium w-52 hidden sm:table-cell">
            Store
          </th>
          <th className="py-2.5 font-medium w-12"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr
            key={item.id}
            className="border-b border-black/[0.05] hover:bg-black/[0.02] transition-colors"
          >
            <td className="py-3 pr-4 text-black/20 font-mono text-sm tabular-nums">
              {item.id}
            </td>
            <td className="py-3 pr-4">
              <button
                onClick={() => onEdit(item)}
                className="text-base text-black hover:underline underline-offset-2 cursor-pointer text-left"
              >
                {item.name}
              </button>
              {item.name !== item.originalName && (
                <span className="block text-xs text-black/30 mt-0.5">
                  {item.originalName}
                </span>
              )}
              <span className="sm:hidden block text-xs text-black/40 mt-0.5">
                {item.store}
              </span>
            </td>
            <td className="py-3 text-black/45 text-sm hidden sm:table-cell">
              {item.store}
            </td>
            <td className="py-3 text-center">
              <AddButton
                inCart={cart.has(item.id)}
                onToggle={() => onToggleCart(item.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TableView({ items, cart, onToggleCart, onEdit }: ViewProps) {
  return (
    <table className="w-full border-collapse border border-black/15">
      <thead>
        <tr className="bg-black/[0.03]">
          <th className="border border-black/15 px-3 py-2.5 text-left text-xs font-medium text-black/50 uppercase tracking-wider w-14">
            #
          </th>
          <th className="border border-black/15 px-3 py-2.5 text-left text-xs font-medium text-black/50 uppercase tracking-wider">
            Ingredient
          </th>
          <th className="border border-black/15 px-3 py-2.5 text-left text-xs font-medium text-black/50 uppercase tracking-wider hidden sm:table-cell">
            Original Name
          </th>
          <th className="border border-black/15 px-3 py-2.5 text-left text-xs font-medium text-black/50 uppercase tracking-wider w-52">
            Store
          </th>
          <th className="border border-black/15 px-3 py-2.5 text-center text-xs font-medium text-black/50 uppercase tracking-wider w-14"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <tr
            key={item.id}
            className={`hover:bg-black/[0.03] transition-colors ${
              i % 2 === 1 ? "bg-black/[0.015]" : ""
            }`}
          >
            <td className="border border-black/10 px-3 py-2.5 font-mono text-sm text-black/25 tabular-nums">
              {item.id}
            </td>
            <td className="border border-black/10 px-3 py-2.5 text-base text-black">
              <button
                onClick={() => onEdit(item)}
                className="hover:underline underline-offset-2 cursor-pointer text-left"
              >
                {item.name}
              </button>
            </td>
            <td className="border border-black/10 px-3 py-2.5 text-sm text-black/35 hidden sm:table-cell">
              {item.name !== item.originalName ? item.originalName : "\u2014"}
            </td>
            <td className="border border-black/10 px-3 py-2.5 text-sm text-black/50">
              {item.store}
            </td>
            <td className="border border-black/10 px-3 py-2.5 text-center">
              <AddButton
                inCart={cart.has(item.id)}
                onToggle={() => onToggleCart(item.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface RowData {
  originalName: string;
  name: string;
  store: string;
}

const EMPTY_ROW: RowData = { originalName: "", name: "", store: "" };

function AddItemsModal({
  onClose,
  onPublish,
  isPending,
}: {
  onClose: () => void;
  onPublish: (rows: RowData[]) => void;
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
        {/* Modal header */}
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

        {/* Spreadsheet grid */}
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

        {/* Modal footer */}
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

function EditItemModal({
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
        {/* Header */}
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

        {/* Form */}
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

        {/* Footer */}
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
