import type { MetadataRoute } from "next";

// The web-app manifest: what makes "Add to Home Screen" install APEX as
// an app (own icon, own window, no Safari bars) instead of a bookmark.
// The installed app opens straight on the dashboard, not the landing.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "APEX — F1 Dashboard",
    short_name: "APEX",
    description: "Formula 1 dashboard for the 2026 season",
    start_url: "/overview",
    display: "standalone",
    background_color: "#060608",
    theme_color: "#060608",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
