import { expect, test } from "@playwright/test";
import { openApp } from "./helpers.ts";

test.use({
  permissions: [],
  launchOptions: {
    executablePath:
      process.env.PW_CHROMIUM_PATH ?? (process.env.PLAYWRIGHT_BROWSERS_PATH ? "/opt/pw-browsers/chromium" : undefined),
    args: [
      "--use-fake-device-for-media-stream",
      "--deny-permission-prompts",
      "--autoplay-policy=no-user-gesture-required",
    ],
  },
});

test("izin kamera ditolak: pesan jelas, tidak crash, keyboard tetap berfungsi", async ({ page }) => {
  const errors = await openApp(page);
  await page.getByRole("button", { name: "Mulai Bermain" }).click();
  await expect(page.getByRole("heading", { name: "Kamera belum bisa dipakai" })).toBeVisible();
  await expect(page.getByText(/Izin kamera ditolak/).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  // Fallback: piano di layar tetap bisa dimainkan.
  await page.getByRole("button", { name: /^C4/ }).dispatchEvent("pointerdown");
  await expect(page.getByTestId("active-notes")).toHaveText("C4");
  await page.getByRole("group", { name: /Keyboard piano/ }).dispatchEvent("pointerup");
  expect(errors.filter((e) => !/Permission|NotAllowed/i.test(e))).toEqual([]);
});
