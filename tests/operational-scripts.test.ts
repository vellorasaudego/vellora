import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const packageJsonPath = join(projectRoot, "package.json");
const provisioningDocumentationPath = join(projectRoot, "SUPABASE_PROVISIONING.md");
const releaseDocumentationPath = join(projectRoot, "SUPABASE_RELEASE.md");

const administrativeKeyNames = [
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

type TextFile = {
  path: string;
  contents: string;
};

type KeyAssignment = {
  file: string;
  line: number;
  key: string;
  value: string;
};

function collectDocumentationAndExamples(directory: string): TextFile[] {
  const ignoredDirectories = new Set([
    ".agents",
    ".codex",
    ".git",
    ".next",
    "coverage",
    "dist",
    "node_modules",
  ]);
  const files: TextFile[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) {
        files.push(...collectDocumentationAndExamples(join(directory, entry.name)));
      }
      continue;
    }

    const filePath = join(directory, entry.name);
    const relativePath = relative(projectRoot, filePath);
    const isMarkdown = entry.name.toLowerCase().endsWith(".md");
    const isNamedExample = entry.name.toLowerCase().includes(".example");
    const isInExamplesDirectory = /(^|[\\/])examples?([\\/]|$)/i.test(relativePath);

    if (isMarkdown || isNamedExample || isInExamplesDirectory) {
      files.push({ path: relativePath, contents: readFileSync(filePath, "utf8") });
    }
  }

  return files;
}

function findAdministrativeKeyAssignments(file: TextFile): KeyAssignment[] {
  const assignmentPattern =
    /^\s*(?:[-*]\s+)?(?:`)?(?:\$env:)?(SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY))(?:`)?\s*(?:=|:)\s*(.*?)\s*(?:`)?$/i;

  return file.contents.split(/\r?\n/).flatMap((line, index) => {
    const match = line.match(assignmentPattern);
    if (!match) {
      return [];
    }

    return [
      {
        file: file.path,
        line: index + 1,
        key: match[1],
        value: match[2].trim(),
      },
    ];
  });
}

function isClearlyPlaceholder(value: string): boolean {
  const normalized = value
    .trim()
    .replace(/^['"`]|['"`]$/g, "")
    .trim();

  if (!normalized) {
    return true;
  }

  return (
    /<[^>\r\n]+>/.test(normalized) ||
    /\b(?:example|exemplo|placeholder|replace|seu|sua|your)\b/i.test(normalized)
  );
}

const documentationAndExamples = collectDocumentationAndExamples(projectRoot);

describe("contrato dos scripts operacionais Supabase", () => {
  it("carrega .env nos comandos de provisionamento e smoke", () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
    };

    for (const [scriptName, scriptPath] of [
      ["supabase:provision-user", "scripts/provision-supabase-user.mjs"],
      ["supabase:smoke", "scripts/supabase-smoke.mjs"],
    ] as const) {
      const command = packageJson.scripts?.[scriptName];

      expect(command, `${scriptName} deve existir`).toBeDefined();
      expect(command).toContain("node --env-file-if-exists=.env");
      expect(command).toContain(scriptPath);
    }
  });

  it("não deixa chaves administrativas como configuração real em exemplos ou documentação", () => {
    const environmentExamples = documentationAndExamples.filter(({ path }) =>
      /\.env(?:\.[^/\\]+)?\.example$/i.test(path),
    );
    const assignments = documentationAndExamples.flatMap(findAdministrativeKeyAssignments);
    const realAssignments = assignments.filter(({ value }) => !isClearlyPlaceholder(value));
    const credentialLikeValues = documentationAndExamples.flatMap(({ path, contents }) => {
      const matches = contents.match(
        /\b(?:sb_(?:secret|service_role)_[A-Za-z0-9._-]{10,}|eyJ[A-Za-z0-9._-]{20,})\b/g,
      );

      return (matches ?? []).map((value) => ({ path, value }));
    });

    expect(environmentExamples.length).toBeGreaterThan(0);
    expect(
      environmentExamples.flatMap(findAdministrativeKeyAssignments),
      "arquivos .env.example não devem declarar chaves administrativas",
    ).toEqual([]);
    expect(realAssignments, "documentação só pode usar valores vazios ou placeholders").toEqual([]);
    expect(credentialLikeValues, "credenciais administrativas não podem ser versionadas").toEqual([]);

    for (const file of documentationAndExamples) {
      expect(file.contents).not.toMatch(
        /(?:^|[\r\n])\s*(?:\$env:)?NEXT_PUBLIC_SUPABASE_(?:SECRET_KEY|SERVICE_ROLE_KEY)\s*(?:=|:)/im,
      );
    }

    expect(administrativeKeyNames).toEqual([
      "SUPABASE_SECRET_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });

  it("documenta URL, e-mail, nome, senha e papel do provisionamento", () => {
    const documentation = readFileSync(provisioningDocumentationPath, "utf8");

    for (const variable of [
      "SUPABASE_URL",
      "SUPABASE_PROVISION_EMAIL",
      "SUPABASE_PROVISION_NAME",
      "SUPABASE_PROVISION_PASSWORD",
      "SUPABASE_PROVISION_ROLE",
    ]) {
      expect(documentation).toContain(variable);
    }

    for (const flag of ["--url", "--email", "--name", "--password", "--role"]) {
      expect(documentation).toContain(flag);
    }
  });

  it("deixa explícito que o smoke test é somente leitura", () => {
    const documentation = readFileSync(releaseDocumentationPath, "utf8");

    expect(documentation).toMatch(/supabase:smoke[\s\S]*read-only/i);
    expect(documentation).toMatch(/n[aã]o aplica migrations/i);
    expect(documentation).toMatch(/n[aã]o cria usu[aá]rios/i);
    expect(documentation).toMatch(/n[aã]o grava dados/i);
  });
});
