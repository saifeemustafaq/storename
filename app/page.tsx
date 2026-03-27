import { readConfig } from "./lib/config";
import { loadIngredients, extractStores } from "./lib/csv";
import IngredientFinder from "./components/IngredientFinder";

export const dynamic = "force-dynamic";

export default function Home() {
  const config = readConfig();
  let ingredients;
  let stores;
  let loadError = "";

  try {
    ingredients = loadIngredients(config.csvPath);
    stores = extractStores(ingredients);
  } catch {
    ingredients = [];
    stores = [];
    loadError = `Could not load file: ${config.csvPath}`;
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <IngredientFinder
        ingredients={ingredients}
        stores={stores}
        currentPath={config.csvPath}
        loadError={loadError}
      />
    </div>
  );
}
