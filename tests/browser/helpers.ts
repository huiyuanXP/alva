import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import { expect, type Page } from "@playwright/test";
export async function login(page: Page) {
  // Dedicated fixture credentials, never the production owner's project store.
  const dataDir=realpathSync(resolve(process.env.RENOVATION_TEST_DATA_DIR||'.runtime/browser-test-data'));
  if(!dataDir.startsWith(realpathSync(resolve('.runtime'))+sep))throw Error('Browser credentials must belong to an isolated .runtime test database');
  const code = readFileSync(resolve(dataDir,'owner-access-code'), "utf8").trim();
  const response = await page.request.post("/api/session/login", {
    data: { code },
  });
  expect(response.status()).toBe(200);
  const created=await page.request.post("/api/projects",{data:{}});
  expect(created.status()).toBe(200);
  const project=await created.json();
  await page.goto(`/?project=${encodeURIComponent(project.id)}`);
  await expect(
    page.getByRole("button", { name: "保存项目", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () => {
      try {
        return (await bridge(page, "inspect", {})).camera?.ready;
      } catch {
        return false;
      }
    })
    .toBe(true);
}
export async function bridge(
  page: Page,
  method: string,
  payload: Record<string, unknown>,
): Promise<any> {
  return page.evaluate(
    ({ method, payload }) =>
      new Promise((resolve, reject) => {
        const frame = document.querySelector("iframe")!;
        const project_id = new URL(frame.src).searchParams.get("project");
        const request_id = crypto.randomUUID();
        const timer = setTimeout(() => {
          window.removeEventListener("message", handler);
          reject(new Error("Test bridge timeout"));
        }, 10000);
        const handler = (e: MessageEvent) => {
          if (
            e.origin !== location.origin ||
            e.source !== frame.contentWindow ||
            e.data?.request_id !== request_id
          )
            return;
          clearTimeout(timer);
          window.removeEventListener("message", handler);
          if (e.data.type === "error")
            reject(new Error(e.data.payload.message));
          else resolve(e.data.payload);
        };
        window.addEventListener("message", handler);
        frame.contentWindow!.postMessage(
          {
            channel: "roomnote",
            protocol: 1,
            project_id,
            request_id,
            method,
            payload,
          },
          location.origin,
        );
      }),
    { method, payload },
  );
}
