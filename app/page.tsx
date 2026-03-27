import { getAllIngredients, getStores, getCartItems } from "./actions";
import IngredientFinder from "./components/IngredientFinder";

export const dynamic = "force-dynamic";

export default async function Home() {
  let ingredients: { id: number; originalName: string; name: string; store: string }[] = [];
  let stores: string[] = [];
  let cartItems: number[] = [];
  let loadError = "";

  try {
    [ingredients, stores, cartItems] = await Promise.all([
      getAllIngredients(),
      getStores(),
      getCartItems(),
    ]);
  } catch {
    loadError = "Could not connect to database. Check your MONGODB_URI.";
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-black font-sans">
      <IngredientFinder
        ingredients={ingredients}
        stores={stores}
        initialCart={cartItems}
        loadError={loadError}
      />
    </div>
  );
}
