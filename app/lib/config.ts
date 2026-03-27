import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

const CONFIG_PATH = resolve(process.cwd(), ".ingredient-config.json");

interface Config {
  csvPath: string;
}

const DEFAULT_CONFIG: Config = {
  csvPath: resolve(process.cwd(), "store and name.csv"),
};

export function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    writeConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function writeConfig(config: Config): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
