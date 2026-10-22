import { defineConfig } from "@playwright/test";

// La prueba de fuego corre en móvil (390×844) contra la API y la web locales.
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5173",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    // Opcional: usa un Chromium ya instalado (PW_CHROMIUM_PATH=/ruta/al/binario).
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  webServer: [
    { command: "npm run start -w apps/api", url: "http://localhost:3000/api/promo", reuseExistingServer: true, timeout: 60_000 },
    { command: "npm run dev -w apps/web", url: "http://localhost:5173", reuseExistingServer: true, timeout: 60_000 },
  ],
});
