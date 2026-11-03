import { createStore } from "./adminStore";
import { FAVORITE_GAMES_FILE, gameSlug } from "./favorites";

/**
 * Favourite games used to be read from the Backloggd profile. That page now
 * answers the proof-of-work wall, so the list is kept here instead, picked
 * from Backloggd's search.
 */
export const favoriteGamesStore = createStore(FAVORITE_GAMES_FILE, {
  label: "favourite games",
  keyOf: (e) => String(e.slug ?? ""),
  sanitise: (body) => {
    const slug = gameSlug(String(body.slug ?? ""));
    return slug ? { slug } : null;
  },
});
