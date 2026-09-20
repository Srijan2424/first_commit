import outputs from "../../amplify_outputs.json";
export const demoMode = ["demo", "hosted-demo"].includes(import.meta.env.MODE);
const key = "medpal.demo.session";
const hosted = import.meta.env.MODE === "hosted-demo";
const base = hosted
  ? (outputs as unknown as { custom?: { demo_api_url: string } }).custom
      ?.demo_api_url
  : "/api/demo";
export function demoWorkspace() {
  const fromUrl = new URLSearchParams(location.search).get("workspace");
  if (fromUrl && /^[a-f0-9-]{36}$/.test(fromUrl))
    localStorage.setItem("medpal.demo.workspace", fromUrl);
  let value = localStorage.getItem("medpal.demo.workspace");
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem("medpal.demo.workspace", value);
  }
  return value;
}
export async function demoRequest<T>(
  path: string,
  input?: unknown,
): Promise<T> {
  if (hosted && !base) throw new Error("Hosted demo backend is not configured");
  if (path === "auth/start")
    input = { ...(input as object), workspace: demoWorkspace() };
  const response = await fetch(`${base}/${path}`, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionStorage.getItem(key) ?? ""}`,
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  const result = await response.json();
  if (!response.ok || result?.error)
    throw new Error(result.error ?? "Demo service unavailable");
  return result;
}
export function saveDemoSession(token: string) {
  sessionStorage.setItem(key, token);
}
export function clearDemoSession() {
  sessionStorage.removeItem(key);
}
export async function downloadDemoPdf(url: string) {
  const response = await fetch(
    url,
    hosted
      ? {}
      : {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem(key) ?? ""}`,
          },
        },
  );
  if (!response.ok) throw new Error("PDF could not be downloaded");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = "MedPal-prescription.pdf";
  a.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
