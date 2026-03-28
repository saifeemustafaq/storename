// LOC guideline: ~300 lines. OK to exceed when splitting would hurt cohesion.
"use client";

import { useState, useMemo, useRef, useEffect, useTransition, useCallback } from "react";
import type { Ingredient, DbStatus } from "../actions";
import {
  addIngredients,
  editIngredient,
  removeIngredient,
  toggleCartItem,
  addItemsToCart,
  clearCart,
  checkDbHealth,
} from "../actions";
import BulkMatcher from "./BulkMatcher";
import DbStatusIndicator from "./DbStatusIndicator";
import AddItemsModal from "./AddItemsModal";
import EditItemModal from "./EditItemModal";
import { ListView, TableView } from "./IngredientListViews";
import CopyButton from "./CopyButton";

type ViewMode = "list" | "table";
type CartSort = "added" | "number";

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
  const [cartOrder, setCartOrder] = useState<number[]>(() => [...initialCart]);
  const [cartSort, setCartSort] = useState<CartSort>("added");
  const [viewingCart, setViewingCart] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkMatcher, setShowBulkMatcher] = useState(false);
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
    setCartOrder([...initialCart]);
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
    const removing = cart.has(id);
    setCart((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (removing) {
      setCartOrder((prev) => prev.filter((x) => x !== id));
    } else {
      setCartOrder((prev) => [...prev, id]);
    }
    startTransition(async () => {
      await toggleCartItem(id);
    });
  };

  const handleClearCart = () => {
    setCart(new Set());
    setCartOrder([]);
    if (viewingCart) setViewingCart(false);
    startTransition(async () => {
      await clearCart();
    });
  };

  const handleBatchAdd = (ids: number[]) => {
    setCart((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    setCartOrder((prev) => {
      const existing = new Set(prev);
      return [...prev, ...ids.filter((id) => !existing.has(id))];
    });
    startTransition(async () => {
      await addItemsToCart(ids);
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

  const sourceList = useMemo(() => {
    if (!viewingCart) return ingredients;
    const cartItems = ingredients.filter((item) => cart.has(item.id));
    if (cartSort === "number") return cartItems;
    const orderIndex = new Map(cartOrder.map((id, i) => [id, i]));
    return [...cartItems].sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
    );
  }, [viewingCart, ingredients, cart, cartSort, cartOrder]);

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
              onClick={() => setShowBulkMatcher(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-black/15 text-black/70 rounded-md hover:border-black/40 hover:text-black transition-colors cursor-pointer"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              Bulk Match
            </button>
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
              <div className="flex items-center gap-2 ml-auto">
                {viewingCart && (
                  <div className="inline-flex items-center border border-black/15 rounded-md overflow-hidden">
                    <button
                      onClick={() => setCartSort("added")}
                      title="Sort by order added"
                      className={`px-2 py-1 text-[11px] transition-colors cursor-pointer ${
                        cartSort === "added"
                          ? "bg-black text-white"
                          : "text-black/40 hover:text-black"
                      }`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setCartSort("number")}
                      title="Sort by ingredient number"
                      className={`px-2 py-1 text-[11px] transition-colors cursor-pointer ${
                        cartSort === "number"
                          ? "bg-black text-white"
                          : "text-black/40 hover:text-black"
                      }`}
                    >
                      #
                    </button>
                  </div>
                )}
                {viewingCart && <CopyButton items={filtered} />}
                <button
                  onClick={handleClearCart}
                  className="text-xs text-black/40 hover:text-black transition-colors cursor-pointer"
                >
                  Clear list
                </button>
              </div>
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

      {showBulkMatcher && (
        <BulkMatcher
          ingredients={ingredients}
          cart={cart}
          onToggleCart={toggleCart}
          onBatchAdd={handleBatchAdd}
          onClose={() => setShowBulkMatcher(false)}
        />
      )}
    </div>
  );
}
