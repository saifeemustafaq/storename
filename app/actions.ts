"use server";

import { existsSync } from "fs";
import { revalidatePath } from "next/cache";
import { readConfig, writeConfig } from "./lib/config";
import {
  loadIngredients,
  extractStores,
  appendIngredients,
  updateIngredient,
  deleteIngredient,
} from "./lib/csv";

export async function updateCsvPath(path: string) {
  const trimmed = path.trim();

  if (!trimmed) {
    return { success: false, error: "Path cannot be empty" };
  }

  if (!existsSync(trimmed)) {
    return { success: false, error: "File not found at that path" };
  }

  try {
    const ingredients = loadIngredients(trimmed);
    if (ingredients.length === 0) {
      return { success: false, error: "No ingredients found in that file" };
    }
    const stores = extractStores(ingredients);

    writeConfig({ csvPath: trimmed });
    revalidatePath("/");

    return { success: true, ingredients, stores };
  } catch {
    return { success: false, error: "Could not parse that CSV file" };
  }
}

export async function getCurrentConfig() {
  return readConfig();
}

export async function addIngredients(
  rows: { originalName: string; name: string; store: string }[]
) {
  const config = readConfig();

  if (!existsSync(config.csvPath)) {
    return { success: false, error: "CSV file not found" };
  }

  const validRows = rows.filter(
    (r) => r.originalName.trim() || r.name.trim() || r.store.trim()
  );

  if (validRows.length === 0) {
    return { success: false, error: "No rows to add" };
  }

  const cleaned = validRows.map((r) => ({
    originalName: r.originalName.trim(),
    name: r.name.trim() || r.originalName.trim(),
    store: r.store.trim(),
  }));

  try {
    const allIngredients = appendIngredients(config.csvPath, cleaned);
    const stores = extractStores(allIngredients);
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to write to CSV file" };
  }
}

export async function editIngredient(
  id: number,
  data: { originalName: string; name: string; store: string }
) {
  const config = readConfig();

  if (!existsSync(config.csvPath)) {
    return { success: false, error: "CSV file not found" };
  }

  if (!data.originalName.trim() && !data.name.trim()) {
    return { success: false, error: "Name cannot be empty" };
  }

  const cleaned = {
    originalName: data.originalName.trim(),
    name: data.name.trim() || data.originalName.trim(),
    store: data.store.trim(),
  };

  try {
    const allIngredients = updateIngredient(config.csvPath, id, cleaned);
    const stores = extractStores(allIngredients);
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to update ingredient" };
  }
}

export async function removeIngredient(id: number) {
  const config = readConfig();

  if (!existsSync(config.csvPath)) {
    return { success: false, error: "CSV file not found" };
  }

  try {
    const allIngredients = deleteIngredient(config.csvPath, id);
    const stores = extractStores(allIngredients);
    revalidatePath("/");
    return { success: true, ingredients: allIngredients, stores };
  } catch {
    return { success: false, error: "Failed to delete ingredient" };
  }
}
