"use client";

import { createContext, useContext, useEffect, useState } from "react";

const FavoriteContext = createContext<{
  favorite: string;
  setFavorite: (name: string) => void;
}>({ favorite: "", setFavorite: () => {} });

export function FavoriteProvider({ children }: { children: React.ReactNode }) {
  const [favorite, setFavoriteState] = useState("");

  useEffect(() => {
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
