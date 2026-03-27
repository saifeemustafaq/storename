import "dotenv/config";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { resolve } from "path";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Set MONGODB_URI in .env.local first");
  process.exit(1);
}

const IngredientSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  originalName: { type: String, default: "" },
  name: { type: String, required: true },
  store: { type: String, required: true },
});

const Ingredient =
  mongoose.models.Ingredient ||
  mongoose.model("Ingredient", IngredientSchema);

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

async function seed() {
  const csvPath = resolve(process.cwd(), "store and name.csv");
  console.log(`Reading CSV from: ${csvPath}`);

  const raw = readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  const rows = lines.slice(1).map((line) => {
    const [id, originalName, name, store] = parseCSVLine(line);
    return {
      id: parseInt(id, 10),
      originalName: originalName || "",
      name: name || originalName || "",
      store: store || "",
    };
  });

  console.log(`Parsed ${rows.length} ingredients from CSV`);

  await mongoose.connect(MONGODB_URI as string);
  console.log("Connected to MongoDB");

  await Ingredient.deleteMany({});
  console.log("Cleared existing ingredients");

  await Ingredient.insertMany(rows);
  console.log(`Inserted ${rows.length} ingredients`);

  await mongoose.disconnect();
  console.log("Done!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
