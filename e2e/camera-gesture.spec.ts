import { expect, test, type Page } from "@playwright/test";
import { enableAudio, openApp, peakLevel } from "./helpers.ts";

/** Suntikkan frame tangan sintetis ke pipeline asli (interpreter → performer → engine) lewat hook ?debug=1. */
interface HandFrame {
  t: number;
  x: number;
  y: number;
  pinch: number;
  /** Landmark ujung jari (12 tengah, 16 manis, 20 kelingking) yang ditempelkan ke ibu jari. */
  touch?: number;
  side?: "left" | "right";
}

async function injectHand(page: Page, frames: HandFrame[]) {
  await page.evaluate((list) => {
    type Ctl = { handleTracking: (r: unknown) => void };
    const ctl = (window as unknown as { __gestura: { controller: Ctl } }).__gestura.controller;
    for (const f of list) {
      const size = 0.15;
      // Koordinat kamera (belum di-mirror). Ujung telunjuk di (x,y).
      const lm = Array.from({ length: 21 }, () => ({ x: f.x, y: f.y + size, z: 0 }));
      lm[0] = { x: f.x, y: f.y + size * 1.6, z: 0 };
      lm[5] = { x: f.x - size * 0.35, y: f.y + size * 0.6, z: 0 };
      lm[9] = { x: f.x, y: f.y + size * 0.6, z: 0 };
      lm[17] = { x: f.x + size * 0.35, y: f.y + size * 0.6, z: 0 };
      lm[8] = { x: f.x, y: f.y, z: 0 };
      lm[4] = { x: f.x - (f.pinch * (size * 1.7)) / 2, y: f.y, z: 0 };
      if (f.touch) lm[f.touch] = { x: lm[4].x, y: f.y + 0.01, z: 0 };
      const side = f.side ?? "right";
      ctl.handleTracking({
        timestamp: f.t,
        hands: f.pinch < 0 ? [] : [{ id: `hand-${side}`, side, score: 0.98, landmarks: lm }],
      });
    }
  }, frames);
}

test.describe("Kamera, MediaPipe, dan gesture", () => {
  test("mulai sesi dengan kamera palsu, model termuat, lalu stop melepas kamera", async ({ page }) => {
    const errors = await openApp(page, { debug: true });
    await page.getByRole("button", { name: "Mulai Bermain" }).click();
    await expect(page.getByText("Kamera aktif")).toBeVisible({ timeout: 45_000 });
    await expect(page.locator("dt", { hasText: "Model tangan" }).locator("..")).toContainText("Siap");
    // Kamera palsu tidak berisi tangan → status tangan tidak terdeteksi, tanpa crash.
    await expect(page.getByRole("status").filter({ hasText: "Tangan tidak terdeteksi" })).toBeVisible();
    // Tracking benar-benar berjalan (fps > 0).
    await expect
      .poll(async () => Number((await page.getByText(/\d+ fps/).textContent())?.replace(/\D/g, "")), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: "Hentikan kamera" }).click();
    await expect(page.getByRole("button", { name: "Mulai Bermain" })).toBeVisible();
    const live = await page.evaluate(() => {
      const v = document.querySelector("video");
      const stream = v?.srcObject as MediaStream | null;
      return stream ? stream.getTracks().filter((t) => t.readyState === "live").length : 0;
    });
    expect(live).toBe(0);
    expect(errors.filter((e) => !/WebGL|GPU|gl_/i.test(e))).toEqual([]);
  });

  test("input jari: tiap jari membunyikan nada berbeda tanpa memindah tangan", async ({ page }) => {
    await openApp(page, { debug: true });
    await enableAudio(page);
    // Default input "Jari", C mayor oktaf 4. Kamera x 0.3 → layar x 0.7 (cermin) = tangan kanan:
    // telunjuk→kelingking = G4 A4 B4 C5.
    await injectHand(page, [
      { t: 1000, x: 0.3, y: 0.5, pinch: 0.9 },
      { t: 1033, x: 0.3, y: 0.5, pinch: 0.9, touch: 12 },
    ]);
    await expect(page.getByTestId("active-notes")).toHaveText("A4");
    expect(await peakLevel(page, 400)).toBeGreaterThan(0.005);
    // Ganti ke jari manis di posisi yang sama.
    await injectHand(page, [{ t: 1066, x: 0.3, y: 0.5, pinch: 0.9, touch: 16 }]);
    await expect(page.getByTestId("active-notes")).toHaveText("B4");
    // Buka jari → nada berhenti.
    await injectHand(page, [{ t: 1100, x: 0.3, y: 0.5, pinch: 0.9 }]);
    await expect(page.getByTestId("active-notes")).toHaveText("—");
    // Nama nada solmisasi / angka (relatif terhadap nada dasar C).
    await page.getByRole("tab", { name: "Musik" }).click();
    await page.getByRole("radio", { name: "Do Re Mi" }).click();
    await injectHand(page, [{ t: 1133, x: 0.3, y: 0.5, pinch: 0.9, touch: 12 }]);
    await expect(page.getByTestId("active-notes")).toHaveText("la");
    await page.getByRole("radio", { name: "1 2 3" }).click();
    await expect(page.getByTestId("active-notes")).toHaveText("6");
  });

  test("panduan tangan SVG: tampil saat sesi, mengikuti jari pengguna, dan bisa dimatikan", async ({ page }) => {
    await openApp(page, { debug: true });
    await page.getByRole("button", { name: "Mulai Bermain" }).click();
    await expect(page.getByText("Kamera aktif")).toBeVisible({ timeout: 45_000 });
    const guide = page.getByRole("region", { name: "Panduan tangan" });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("img", { name: /Tangan kiri: telunjuk C4/ })).toBeVisible();
    await page.evaluate(() => {
      type Ctl = { tracker?: { stop?: () => void } };
      (window as unknown as { __gestura: { controller: Ctl } }).__gestura.controller.tracker?.stop?.();
    });
    await injectHand(page, [{ t: 5000, x: 0.5, y: 0.5, pinch: 0.9, touch: 16 }]);
    await expect(guide.getByRole("img", { name: /Ibu jari sedang menyentuh jari manis/ })).toBeVisible();
    const toggle = page.getByRole("button", { name: "Panduan", exact: true });
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await toggle.click();
    await expect(guide).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(guide).toBeVisible();
  });

  test("input posisi: pinch memainkan nada zona, berpindah zona, dan tangan hilang melepas note", async ({ page }) => {
    await openApp(page, { debug: true });
    await enableAudio(page);
    await page.getByRole("tab", { name: "Musik" }).click();
    await page.getByRole("radio", { name: "Posisi tangan" }).click();
    // Default: C mayor, C4–C5 → 8 zona. Mirror aktif: x kamera 0.94 → x tampilan 0.06 (zona 0 = C4).
    await injectHand(page, [
      { t: 1000, x: 0.94, y: 0.5, pinch: 0.9 },
      { t: 1033, x: 0.94, y: 0.5, pinch: 0.1 },
    ]);
    await expect(page.getByTestId("active-notes")).toHaveText("C4");
    expect(await peakLevel(page, 400)).toBeGreaterThan(0.005);

    // Geser ke zona 4 (G4, x tampilan 0.5–0.625) sambil tetap mencubit, lalu tahan agar smoothing konvergen.
    const frames = [];
    for (let i = 1; i <= 10; i++) frames.push({ t: 1033 + i * 33, x: 0.94 - i * 0.0499, y: 0.5, pinch: 0.1 });
    for (let i = 11; i <= 30; i++) frames.push({ t: 1033 + i * 33, x: 0.441, y: 0.5, pinch: 0.1 });
    await injectHand(page, frames);
    await expect(page.getByTestId("active-notes")).toHaveText("G4");

    // Tangan hilang → setelah grace period semua note tangan itu dilepas.
    await injectHand(page, [
      { t: 2100, x: 0, y: 0, pinch: -1 },
      { t: 2600, x: 0, y: 0, pinch: -1 },
    ]);
    await expect(page.getByTestId("active-notes")).toHaveText("—");
  });

  test("pemilihan instrumen benar-benar mengubah program synthesizer (tanpa off-by-one)", async ({ page }) => {
    await openApp(page, { debug: true });
    await enableAudio(page);
    await page.getByRole("searchbox", { name: "Cari instrumen" }).fill("violin");
    await page.getByRole("button", { name: /^041 Violin/ }).click();
    const readPatch = () =>
      page.evaluate(() => {
        type Engine = { synth: { midiChannels: { patch: { program: number; name: string } }[] } };
        const ctl = (window as unknown as { __gestura: { controller: { engine: Engine } } }).__gestura.controller;
        const p = ctl.engine.synth.midiChannels[0]!.patch;
        return `${p.program}:${p.name}`;
      });
    // Patch kanal dilaporkan balik oleh AudioWorklet secara asinkron; patch baru diterapkan saat note berikutnya.
    await page.keyboard.down("KeyA");
    await page.keyboard.up("KeyA");
    await expect.poll(readPatch).toMatch(/^40:.*violin/i);
    await page.getByRole("searchbox", { name: "Cari instrumen" }).fill("tenor sax");
    await page.getByRole("button", { name: /^067 Tenor Sax/ }).click();
    await page.keyboard.down("KeyA");
    await page.keyboard.up("KeyA");
    await expect.poll(readPatch).toMatch(/^66:.*sax/i);
  });
});
