import { readFileSync } from "node:fs";
import { Catalogue } from "../src/engine/types";

const raw = JSON.parse(readFileSync("data/catalogue/catalogue.json", "utf8"));
const parsed = Catalogue.parse(raw);
const ids = new Set<string>();
for (const c of parsed.cards) {
  if (ids.has(c.id)) throw new Error(`duplicate card id: ${c.id}`);
  ids.add(c.id);
}
console.log(`catalogue ok: ${parsed.cards.length} cards, version ${parsed.version}`);
