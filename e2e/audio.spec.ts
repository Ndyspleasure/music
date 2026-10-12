import { expect, test } from "@playwright/test";
import { enableAudio, openApp, peakLevel } from "./helpers.ts";

test.describe("Audio engine & katalog GM", () => {
  test("halaman termuat tanpa error dan katalog 128 GM tampil sebelum audio aktif", async ({ page }) => {
    const errors = await openApp(page);
    await expect(page).toHaveTitle(/Gestura/);
    await expect(page.getByRole("list", { name: /Daftar instrumen \(128\)/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Mulai Bermain" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("SoundFont termuat, 128 program tersedia, dan beberapa keluarga GM benar-benar berbunyi", async ({ page }) => {
    const errors = await openApp(page);
    await enableAudio(page);
    await expect(page.getByText("128/128")).toBeVisible();
    await expect(
      page
        .getByText(/Sound bank/)
        .locator("..")
        .getByText("GeneralUser GS v2.0.3"),
    ).toBeVisible();

    // Program 0-based → nomor tampilan 1-based: 001 Piano, 025 Gitar nylon, 041 Violin, 057 Trumpet, 066 Alto Sax, 074 Flute, 081 Square lead.
    const families = [
      "Acoustic Grand Piano",
      "Acoustic Guitar (nylon)",
      "Violin",
      "Trumpet",
      "Alto Sax",
      "Flute",
      "Lead 1 (square)",
    ];
    for (const name of families) {
      await page.getByRole("searchbox", { name: "Cari instrumen" }).fill(name);
      await page
        .getByRole("button", { name: new RegExp(`^\\d{3} ${name.replace(/[()]/g, "\\$&")}`) })
        .first()
        .click();
      await expect(page.getByText(new RegExp(`Program \\d{3}`))).toBeVisible();
      await page.keyboard.down("KeyG"); // G4
      const peak = await peakLevel(page, 700);
      await page.keyboard.up("KeyG");
      expect(peak, `${name} harus menghasilkan suara`).toBeGreaterThan(0.005);
    }
    await page.getByRole("searchbox", { name: "Cari instrumen" }).fill("");
    // Setelah dilepas dan panik, output harus kembali senyap (tidak ada note tersangkut).
    await page.keyboard.press("Escape");
    await page.waitForTimeout(2500);
    expect(await peakLevel(page, 300)).toBeLessThan(0.002);
    expect(errors).toEqual([]);
  });

  test("mode drum memukul pad pada kanal perkusi", async ({ page }) => {
    await openApp(page);
    await enableAudio(page);
    await page.getByRole("tab", { name: "Musik" }).click();
    await page.getByRole("radio", { name: "Drum" }).click();
    await expect(page.getByRole("group", { name: "Pad drum" })).toBeVisible();
    await page.getByRole("button", { name: /^Snare/ }).dispatchEvent("pointerdown");
    expect(await peakLevel(page, 500)).toBeGreaterThan(0.005);
    await page.keyboard.press("KeyA"); // kick
    expect(await peakLevel(page, 500)).toBeGreaterThan(0.005);
  });
});
