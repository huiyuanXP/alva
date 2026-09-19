import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { login, bridge } from "./helpers.js";
import { evidencePath } from "./evidence.js";
test("real OpenPlan3D: rendering, navigation, selection, native JSON save/reload and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const initial = await bridge(page, "inspect", {});
  expect(initial.camera.ready).toBe(true);
  expect(initial.camera.geometry).toBeGreaterThan(0);
  await expect(
    page.frameLocator("iframe").locator("canvas").first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "旋转视角", exact: true }).click();
  const rotated = await bridge(page, "inspect", {});
  expect(rotated.camera.position).not.toEqual(initial.camera.position);
  await page.getByRole("button", { name: "放大", exact: true }).click();
  const zoomed = await bridge(page, "inspect", {});
  expect(zoomed.camera.position).not.toEqual(rotated.camera.position);
  await bridge(page, "focus", { room_id: "room2" });
  const second = await bridge(page, "inspect", {});
  expect(second.camera.target[0]).toBe(710);
  await bridge(page, "focus", { room_id: "living" });
  expect((await bridge(page, "inspect", {})).camera.target[0]).toBe(240);
  const camera = (await bridge(page, "inspect", {})).camera;
  const sofa = camera.objects.find((o: any) => o.id === "sofa-main");
  await page.frameLocator("iframe").locator("canvas").first().click({position: {x: sofa.x, y: sofa.y}});
  await expect(page.locator(".selection")).toContainText("sofa-main");
  await page.getByRole("button", { name: "关闭家具属性", exact: true }).click();
  await page.getByRole("button", { name: "预览鼠尾草绿", exact: true }).click();
  await expect(page.locator(".project-name")).toContainText("尚未保存");
  await page.getByRole("button", { name: "保存项目", exact: true }).click();
  await expect(page.locator(".project-name")).toContainText("后端已保存");
  const before = await bridge(page, "snapshot", {});
  await page.reload();
  await expect(
    page.getByRole("button", { name: "保存项目", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () => {
      try {
        return (await bridge(page, "snapshot", {})).scene?.floors[0]
          .furniture[0].color;
      } catch {
        return "";
      }
    })
    .toBe("#b7c9ae");
  const after = await bridge(page, "snapshot", {});
  expect(after.scene.floors[0].furniture[0].id).toBe("sofa-main");
  expect(after.version).toBe(before.version);
  await expect(
    bridge(page, "update", {
      object_id: "sofa-main",
      expected_version: -1,
      patch: { width: 300 },
    }),
  ).rejects.toThrow("Version conflict");
  await expect(
    bridge(page, "select", { object_id: "not-an-object" }),
  ).rejects.toThrow("Unknown object");
  await bridge(page, "mode", {mode: "walk"});
  expect((await bridge(page, "inspect", {})).camera.walkthrough).toBe(true);
  await bridge(page, "mode", {mode: "3d"});
  await bridge(page, "focus", {room_id: "living"});
  await page.screenshot({
    path: evidencePath("01-desktop.png"),
    fullPage: true,
  });
  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: evidencePath(`01-${width}.png`),
      fullPage: true,
    });
  }
  await bridge(page, "mode", { mode: "2d" });
  await expect(
    page.frameLocator("iframe").locator("canvas").first(),
  ).toBeVisible();
  await bridge(page, "focus", { room_id: "room2" });
  await bridge(page, "mode", { mode: "3d" });
  await expect
    .poll(async () => (await bridge(page, "inspect", {})).camera?.ready)
    .toBe(true);
  writeFileSync(
    evidencePath("01-engine-results.json"),
    JSON.stringify(
      {
        initial,
        rotated,
        zoomed,
        second,
        version: after.version,
        restoredId: after.scene.floors[0].furniture[0].id,
        restoredColor: after.scene.floors[0].furniture[0].color,
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
});
