import type { MetadataRoute } from "next";

// Installable PWA (PRD Sec 5, Sec 13 step 9). Opens straight into the demo for showcase use.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Clutch",
    short_name: "Clutch",
    description:
      "What your credit cards cost you, in rupees, and which one to use.",
    start_url: "/demo/checkup",
    display: "standalone",
    background_color: "#F6F4EE",
    theme_color: "#14213D",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
