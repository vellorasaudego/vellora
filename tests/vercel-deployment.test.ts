import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();

function readProjectFile(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), "utf8");
}

describe("preparação do deploy Vercel", () => {
  it("declara build e saída compatíveis com Next.js na Vercel", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const vercelJson = JSON.parse(readProjectFile("vercel.json")) as {
      installCommand?: string;
      buildCommand?: string;
      outputDirectory?: string;
    };

    expect(packageJson.scripts?.["build:vercel"]).toBe("next build");
    expect(vercelJson).toMatchObject({
      installCommand: "npm ci",
      buildCommand: "npm run build:vercel",
      outputDirectory: ".next",
    });
  });

  it("não carrega módulos exclusivos do Cloudflare no runtime Vercel", () => {
    const runtimeConfig = readProjectFile("src/lib/runtime-config.ts");
    const database = readProjectFile("src/lib/db.ts");
    const storage = readProjectFile("src/lib/storage.ts");

    expect(runtimeConfig).not.toContain("cloudflare:workers");
    expect(database).not.toContain("cloudflare:workers");
    expect(storage).not.toContain("cloudflare:workers");
    expect(runtimeConfig).toContain("process.env");
    expect(database).toContain("runtimeBinding");
    expect(storage).toContain("runtimeBinding");
  });

  it("usa um ícone compatível com o decodificador do Turbopack", () => {
    const iconPath = join(projectRoot, "src/app/icon.svg");
    const legacyFaviconPath = join(projectRoot, "src/app/favicon.ico");

    expect(existsSync(iconPath)).toBe(true);
    expect(readFileSync(iconPath, "utf8")).toContain("<svg");
    expect(existsSync(legacyFaviconPath)).toBe(false);
  });
});
