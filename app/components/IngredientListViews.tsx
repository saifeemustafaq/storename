import type { Ingredient } from "../actions";

export interface ViewProps {
  items: Ingredient[];
  cart: Set<number>;
  onToggleCart: (id: number) => void;
  onEdit: (item: Ingredient) => void;
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

export function ListView({ items, cart, onToggleCart, onEdit }: ViewProps) {
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

export function TableView({ items, cart, onToggleCart, onEdit }: ViewProps) {
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
