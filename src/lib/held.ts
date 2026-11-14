import type { HeldCard, UserCard } from "@/engine/types";
import { catalogue } from "./catalogue";

// Joins a user's saved cards with the catalogue; cards no longer in the catalogue are left out.
export const toHeld = (cards: UserCard[]): HeldCard[] =>
  cards.flatMap((u) => {
    const card = catalogue.cards.find((c) => c.id === u.cardId);
    return card ? [{ ...u, card }] : [];
  });
