"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FavoriteContext = createContext<{
  favorite: string;
  setFavorite: (name: string) => void;
}>({ favorite: "", setFavorite: () => {} });

export function FavoriteProvider({ children }: { children: React.ReactNode }) {
  const [favorite, setFavoriteState] = useState("");

  useEffect(() => {
    // Deliberate one-time sync read: localStorage is only available after
    // mount, and the server must render the no-favorite state first.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFavoriteState(localStorage.getItem("apex-favorite") ?? "");
  }, []);

  function setFavorite(name: string) {
    setFavoriteState(name);
    localStorage.setItem("apex-favorite", name);
  }

  return (
    <FavoriteContext.Provider value={{ favorite, setFavorite }}>
      {children}
    </FavoriteContext.Provider>
  );
}

export function useFavorite() {
  return useContext(FavoriteContext);
}
