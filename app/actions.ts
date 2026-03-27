"use server";

import { revalidatePath } from "next/cache";
import dbConnect from "./lib/mongodb";
import IngredientModel from "./lib/models/Ingredient";
import CustomListModel from "./lib/models/CustomList";

export interface Ingredient {
  id: number;
  originalName: string;
  name: string;
  store: string;
}

function serialize(doc: Record<string, unknown>): Ingredient {
  return {
    id: doc.id as number,
    originalName: (doc.originalName as string) || "",
    name: doc.name as string,
    store: doc.store as string,
  };
}

async function getNextId(): Promise<number> {
  const last = await IngredientModel.findOne().sort({ id: -1 }).lean();
  return last ? (last as unknown as Ingredient).id + 1 : 1;
}

export async function getAllIngredients() {
  await dbConnect();
  const docs = await IngredientModel.find().sort({ id: 1 }).lean();
  return (docs as unknown as Record<string, unknown>[]).map(serialize);
}

export async function getStores() {
  await dbConnect();
  const stores: string[] = await IngredientModel.distinct("store");
  return stores.sort();
}

export async function addIngredients(
  rows: { originalName: string; name: string; store: string }[]
) {
  await dbConnect();

  const validRows = rows.filter(
    (r) => r.originalName.trim() || r.name.trim() || r.store.trim()
  );

  if (validRows.length === 0) {
    return { success: false, error: "No rows to add" };
  }

  try {
    let nextId = await getNextId();

    const docs = validRows.map((r) => ({
      id: nextId++,
      originalName: r.originalName.trim(),
      name: r.name.trim() || r.originalName.trim(),
      store: r.store.trim(),
    }));

    await IngredientModel.insertMany(docs);

    const allIngredients = await getAllIngredients();
    const stores = await getStores();
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to add ingredients" };
  }
}

export async function editIngredient(
  id: number,
  data: { originalName: string; name: string; store: string }
) {
  await dbConnect();

  if (!data.originalName.trim() && !data.name.trim()) {
    return { success: false, error: "Name cannot be empty" };
  }

  const cleaned = {
    originalName: data.originalName.trim(),
    name: data.name.trim() || data.originalName.trim(),
    store: data.store.trim(),
  };

  try {
    await IngredientModel.findOneAndUpdate({ id }, cleaned);

    const allIngredients = await getAllIngredients();
    const stores = await getStores();
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to update ingredient" };
  }
}

export async function removeIngredient(id: number) {
  await dbConnect();

  try {
    await IngredientModel.deleteOne({ id });

    await CustomListModel.updateMany({}, { $pull: { items: id } });

    const allIngredients = await getAllIngredients();
    const stores = await getStores();
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to delete ingredient" };
  }
}

// --- Custom List (cart) actions ---

export async function getCartItems(): Promise<number[]> {
  await dbConnect();
  const list = await CustomListModel.findOne({ name: "default" }).lean();
  if (!list) return [];
  return (list as unknown as { items: number[] }).items;
}

export async function toggleCartItem(ingredientId: number) {
  await dbConnect();

  let list = await CustomListModel.findOne({ name: "default" });

  if (!list) {
    list = await CustomListModel.create({ name: "default", items: [ingredientId] });
    return { items: list.items as number[] };
  }

  const idx = list.items.indexOf(ingredientId);
  if (idx === -1) {
    list.items.push(ingredientId);
  } else {
    list.items.splice(idx, 1);
  }

  await list.save();
  return { items: list.items as number[] };
}

export async function addItemsToCart(ingredientIds: number[]) {
  await dbConnect();

  if (ingredientIds.length === 0) return { items: [] as number[] };

  let list = await CustomListModel.findOne({ name: "default" });

  if (!list) {
    list = await CustomListModel.create({ name: "default", items: ingredientIds });
    return { items: list.items as number[] };
  }

  const existing = new Set(list.items as number[]);
  for (const id of ingredientIds) {
    if (!existing.has(id)) {
      list.items.push(id);
    }
  }

  await list.save();
  return { items: list.items as number[] };
}

export async function clearCart() {
  await dbConnect();
  await CustomListModel.findOneAndUpdate(
    { name: "default" },
    { items: [] },
    { upsert: true }
  );
  return { items: [] as number[] };
}

// --- Database health check ---

export interface DbStatus {
  connected: boolean;
  dbName: string;
  ingredientCount: number;
  checkedAt: string;
}

export async function checkDbHealth(): Promise<DbStatus> {
  try {
    const mongoose = await dbConnect();
    const count = await IngredientModel.countDocuments();
    return {
      connected: mongoose.connection.readyState === 1,
      dbName: mongoose.connection.db?.databaseName ?? "unknown",
      ingredientCount: count,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      connected: false,
      dbName: "",
      ingredientCount: 0,
      checkedAt: new Date().toISOString(),
    };
  }
}
