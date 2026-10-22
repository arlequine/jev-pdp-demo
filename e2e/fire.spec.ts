// La prueba de fuego: el criterio de aceptación de toda la demo.
// Hoy (main) está en rojo; en refactor/pdp-recorded, en verde.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { execSync } from "node:child_process";
import fs from "node:fs";

const PRICE_CENTS = 129950; // seed de la API, SIN IVA
const TOTAL_CENTS = Math.round((PRICE_CENTS * 116) / 100); // 150742 · la aritmética vive aquí, nunca en Jev
const EXPECTED = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(TOTAL_CENTS / 100); // $1,507.42

const results: { check: string; ok: boolean; detail?: string }[] = [];
let priceSeen = "";

test.beforeEach(async ({ page }) => {
  await page.goto("/p/playera-basica");
  await page.getByRole("button", { name: "Agregar al carrito" }).waitFor();
  await page.waitForLoadState("networkidle");
});

test.afterEach(async ({}, info) => {
  results.push({ check: info.title.split(" ")[0], ok: info.status === "passed", detail: info.error?.message?.split("\n")[0] });
});

test.afterAll(() => {
  if (!process.env.FIRE_LOG) return;
  const sh = (c: string) => {
    try {
      return execSync(c, { encoding: "utf8" }).trim();
    } catch {
      return "";
    }
  };
  fs.mkdirSync("metrics", { recursive: true });
  fs.appendFileSync(
    "metrics/fire-runs.jsonl",
    JSON.stringify({ at: new Date().toISOString(), branch: sh("git rev-parse --abbrev-ref HEAD"), sha: sh("git rev-parse --short HEAD"), priceSeen, checks: results }) + "\n",
  );
});

test(`F1 · Precio: ${EXPECTED} con «IVA incluido»`, async ({ page }) => {
  const priceText = await page.locator("body").innerText();
  priceSeen = priceText.match(/\$\s?[\d,]+(\.\d+)?/)?.[0] ?? "";
  await expect(page.getByText(EXPECTED, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/IVA incluido/i).first()).toBeVisible();
});

test("F2 · Botón: visible sin scroll y nada lo tapa", async ({ page }) => {
  const button = page.getByRole("button", { name: "Agregar al carrito" });
  const box = await button.boundingBox();
  expect(box, "el botón no tiene caja").not.toBeNull();
  const vp = page.viewportSize()!;
  expect(box!.y + box!.height, "el botón queda debajo del viewport").toBeLessThanOrEqual(vp.height);
  const onTop = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return !!el?.closest("button")?.textContent?.includes("Agregar al carrito");
  }, { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 });
  expect(onTop, "algo tapa el centro del botón").toBe(true);
});

test("F3 · Carrito: manda { sku, quantity } y la API calcula el total", async ({ page }) => {
  const [request] = await Promise.all([
    page.waitForRequest((r) => r.url().endsWith("/api/cart") && r.method() === "POST", { timeout: 10_000 }),
    // dispatchEvent: F3 revisa el payload aunque F2 falle (en main el banner tapa el botón)
    page.getByRole("button", { name: "Agregar al carrito" }).dispatchEvent("click"),
  ]);
  const body = request.postDataJSON();
  expect(Object.keys(body).sort(), "el body lleva más que sku y quantity").toEqual(["quantity", "sku"]);
  const response = await request.response();
  const json = await response!.json();
  expect(json.total, "el total no es el que calcula la API con IVA").toBe(TOTAL_CENTS);
});

test("F4 · Accesibilidad: sin violaciones serias ni críticas", async ({ page }) => {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id} (${v.impact})`), "violaciones de axe").toEqual([]);
});
