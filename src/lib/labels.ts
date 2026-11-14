import type { Category } from "@/engine/types";

// Plain labels for the PRD Sec 8.1 categories, in the order people usually think of them.
export const CATEGORY_LABELS: Record<Category, string> = {
  groceries: "Groceries",
  dining: "Dining and food delivery",
  "online-shopping": "Online shopping",
  fuel: "Fuel",
  utilities: "Electricity, gas and water bills",
  telecom: "Mobile, broadband and DTH",
  "travel-flights": "Flights",
  "travel-hotels": "Hotels",
  entertainment: "Movies and entertainment",
  insurance: "Insurance",
  education: "Education",
  rent: "Rent",
  "wallet-load": "Wallet top-up",
  government: "Government and tax",
  other: "Anything else",
};
