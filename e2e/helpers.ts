import { expect, type Page } from "@playwright/test";

/** Buka aplikasi dengan hook debug dan tutup tutorial awal. */
export async function openApp(page: Page, opts: { debug?: boolean } = {}): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(opts.debug ? "/?debug=1" : "/");
  const dialog = page.getByRole("dialog", { name: "Cara bermain" });
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: "Mengerti" }).click();
  }
  return errors;
}

/** Aktifkan audio dan tunggu SoundFont selesai dimuat. */
export async function enableAudio(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: /Aktifkan audio/ })
    .first()
    .click();
  await expect(page.getByText(/program GM tersedia di sound bank aktif/)).toBeVisible({ timeout: 45_000 });
}

/** Level RMS output terbaru dari meter (atribut data-level). */
export async function outputLevel(page: Page): Promise<number> {
  return Number((await page.getByTestId("level-meter").getAttribute("data-level")) ?? 0);
}

/** Puncak level output selama `ms` milidetik. */
export async function peakLevel(page: Page, ms: number): Promise<number> {
  return page.evaluate(async (duration) => {
    const el = document.querySelector<HTMLElement>("[data-testid=level-meter]");
    let peak = 0;
    const end = performance.now() + duration;
    while (performance.now() < end) {
      peak = Math.max(peak, Number(el?.dataset.level ?? 0));
      await new Promise((r) => setTimeout(r, 16));
    }
    return peak;
  }, ms);
}
