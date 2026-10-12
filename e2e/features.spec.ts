import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { enableAudio, openApp, peakLevel } from "./helpers.ts";

test("looper: rekam, putar ulang otomatis, overdub, mute, dan ekspor MIDI", async ({ page }) => {
  await openApp(page);
  await enableAudio(page);
  await page.getByRole("tab", { name: "Looper" }).click();
  await page.getByRole("button", { name: "Rekam" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Merekam" })).toBeVisible();
  for (const key of ["KeyA", "KeyD", "KeyG"]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(250);
    await page.keyboard.up(key);
    await page.waitForTimeout(100);
  }
  await page.getByRole("button", { name: "Selesai" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Memutar loop" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Layer loop" }).getByRole("listitem")).toHaveCount(1);
  // Loop diputar ulang tanpa input → ada suara.
  await page.waitForTimeout(300);
  expect(await peakLevel(page, 2500)).toBeGreaterThan(0.005);

  // Overdub dengan drum.
  await page.getByRole("tab", { name: "Musik" }).click();
  await page.getByRole("radio", { name: "Drum" }).click();
  await page.getByRole("tab", { name: "Looper" }).click();
  await page.getByRole("button", { name: "Overdub" }).click();
  await page.keyboard.press("KeyA");
  await page.waitForTimeout(200);
  await page.keyboard.press("KeyS");
  await page.getByRole("button", { name: "Selesai" }).click();
  await expect(page.getByRole("list", { name: "Layer loop" }).getByRole("listitem")).toHaveCount(2);
  await page.getByRole("button", { name: "Bisukan Layer 1" }).click();
  await expect(page.getByRole("button", { name: "Bunyikan Layer 1" })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Ekspor MIDI/ }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^gestura-loop-.*\.mid$/);
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 4).toString("ascii")).toBe("MThd");

  await page.getByRole("button", { name: "Stop" }).last().click();
  await page.waitForTimeout(1500);
  expect(await peakLevel(page, 400)).toBeLessThan(0.003);
});

test("sound pack pengguna dimuat dengan bank offset dan bisa dimainkan", async ({ page }) => {
  await openApp(page);
  await enableAudio(page);
  await page.getByLabel("Pilih file sound pack").setInputFiles("public/soundfonts/GeneralUser-GS.sf3");
  await expect(page.getByText(/GeneralUser-GS\.sf3 · \d+ preset/)).toBeVisible({ timeout: 45_000 });
  await page.getByRole("combobox", { name: "Sumber" }).selectOption("custom-pack");
  const list = page.getByRole("list", { name: /Daftar instrumen/ });
  await expect(list.getByRole("button").first()).toBeVisible();
  await expect(list.getByText(/MSB 64/).first()).toBeVisible();
  await list.getByRole("button").first().click();
  await page.keyboard.down("KeyG");
  expect(await peakLevel(page, 600)).toBeGreaterThan(0.005);
  await page.keyboard.up("KeyG");
  await page.getByRole("button", { name: "Lepas sound pack" }).click();
  await expect(list.getByText("Tidak ada instrumen yang cocok.")).toBeVisible();
});

test("preset & setelan tersimpan di localStorage dan bertahan setelah reload", async ({ page }) => {
  await openApp(page);
  await page.getByRole("tab", { name: "Musik" }).click();
  await page.getByLabel("Tangga nada", { exact: true }).selectOption("dorian");
  await page.getByLabel("Nada dasar (key)").selectOption("2");
  await page.getByRole("tab", { name: "Preset" }).click();
  await page.getByLabel("Nama preset").fill("D Dorian");
  await page.getByRole("button", { name: "Simpan" }).click();
  await expect(page.getByRole("button", { name: /^D Dorian/ })).toBeVisible();
  await page.waitForTimeout(600); // debounce penyimpanan setelan
  await page.reload();
  await page.getByRole("tab", { name: "Musik" }).click();
  await expect(page.getByLabel("Tangga nada", { exact: true })).toHaveValue("dorian");
  await expect(page.getByLabel("Nada dasar (key)")).toHaveValue("2");
  await page.getByRole("tab", { name: "Preset" }).click();
  await expect(page.getByRole("button", { name: /^D Dorian/ })).toBeVisible();
});

test("tangkapan layar UI desktop dan mobile", async ({ page }) => {
  await openApp(page);
  await enableAudio(page);
  await page.screenshot({
    path: `${process.env.SCREENSHOT_DIR ?? "test-results/screenshots"}/desktop.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `${process.env.SCREENSHOT_DIR ?? "test-results/screenshots"}/mobile.png`,
    fullPage: true,
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
