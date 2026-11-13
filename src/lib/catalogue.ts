import raw from "../../data/catalogue/catalogue.json";
import { Catalogue } from "@/engine/types";

// Sec 7.1. Static, versioned file; parsed once at import so a bad catalogue fails loudly.
export const catalogue: Catalogue = Catalogue.parse(raw);
