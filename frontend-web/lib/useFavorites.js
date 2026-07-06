import { useState, useCallback, useEffect } from "react";

const KEY = "immobf_favs";

function readFavs() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

/**
 * Hook favoris — stockage localStorage uniquement.
 * Retourne :
 *   favIds   : string[]  — IDs des annonces sauvegardées
 *   toggle   : (id) => void
 *   isFav    : (id) => bool
 *   clearAll : () => void
 */
export function useFavorites() {
  const [favIds, setFavIds] = useState([]);

  useEffect(() => {
    setFavIds(readFavs());
  }, []);

  const toggle = useCallback((id) => {
    setFavIds((prev) => {
      const sid = String(id);
      const next = prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid];
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isFav = useCallback((id) => favIds.includes(String(id)), [favIds]);

  const clearAll = useCallback(() => {
    setFavIds([]);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return { favIds, toggle, isFav, clearAll };
}
