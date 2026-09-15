import { createStore } from "./adminStore";
import { FAVORITE_FILMS_FILE, filmSlug } from "./favorites";

/**
 * Favourite films used to be read from the Letterboxd profile. That page now
 * answers Cloudflare's bot challenge, so the list is kept here instead and
 * edited by hand - it changes rarely, and each film's details still come from
 * its own page, which answers normally.
 */
export const favoriteFilmsStore = createStore(FAVORITE_FILMS_FILE, {
  label: "favourite films",
  keyOf: (e) => String(e.slug ?? ""),
  sanitise: (body) => {
    const slug = filmSlug(String(body.slug ?? body.url ?? ""));
    return slug ? { slug } : null;
  },
});
