import { readFileSync, appendFileSync, writeFileSync } from "fs";

export interface Ingredient {
  id: number;
  originalName: string;
  name: string;
  store: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function loadIngredients(csvPath: string): Ingredient[] {
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());

  // Skip header row
  return lines.slice(1).map((line) => {
    const [id, originalName, name, store] = parseCSVLine(line);
    return {
      id: parseInt(id, 10),
      originalName,
      name,
      store,
    };
  });
}

export function extractStores(ingredients: Ingredient[]): string[] {
  const stores = new Set(ingredients.map((i) => i.store));
  return Array.from(stores).sort();
}

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function appendIngredients(
  csvPath: string,
  rows: { originalName: string; name: string; store: string }[]
): Ingredient[] {
  const existing = loadIngredients(csvPath);
  const maxId = existing.length > 0 ? Math.max(...existing.map((i) => i.id)) : 0;

  const newIngredients: Ingredient[] = rows.map((row, i) => ({
    id: maxId + i + 1,
    originalName: row.originalName,
    name: row.name,
    store: row.store,
  }));

  const csvLines = newIngredients.map(
    (item) =>
      `${item.id},${escapeCSVField(item.originalName)},${escapeCSVField(item.name)},${escapeCSVField(item.store)}`
  );

  appendFileSync(csvPath, "\n" + csvLines.join("\n"), "utf-8");

  return [...existing, ...newIngredients];
}

export function updateIngredient(
  csvPath: string,
  id: number,
  data: { originalName: string; name: string; store: string }
): Ingredient[] {
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n");
  const headerLine = lines[0];

  const updatedLines = [headerLine];
  const allIngredients: Ingredient[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const [lineId] = parseCSVLine(line);
    const parsedId = parseInt(lineId, 10);

    if (parsedId === id) {
      const updated: Ingredient = {
        id,
        originalName: data.originalName,
        name: data.name,
        store: data.store,
      };
      updatedLines.push(
        `${id},${escapeCSVField(data.originalName)},${escapeCSVField(data.name)},${escapeCSVField(data.store)}`
      );
      allIngredients.push(updated);
    } else {
      updatedLines.push(line);
      const [, originalName, name, store] = parseCSVLine(line);
      allIngredients.push({ id: parsedId, originalName, name, store });
    }
  }

  writeFileSync(csvPath, updatedLines.join("\n"), "utf-8");
  return allIngredients;
}

export function deleteIngredient(csvPath: string, id: number): Ingredient[] {
  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n");
  const headerLine = lines[0];

  const kept = [headerLine];
  const allIngredients: Ingredient[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const [lineId, originalName, name, store] = parseCSVLine(line);
    const parsedId = parseInt(lineId, 10);

    if (parsedId !== id) {
      kept.push(line);
      allIngredients.push({ id: parsedId, originalName, name, store });
    }
  }

  writeFileSync(csvPath, kept.join("\n"), "utf-8");
  return allIngredients;
}
