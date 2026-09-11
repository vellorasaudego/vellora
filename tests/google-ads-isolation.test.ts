import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8").replaceAll("\r\n", "\n");
}

const adsTag = readProjectFile("src/components/GoogleAdsTag.tsx");
const publicNav = readProjectFile("src/components/PublicNav.tsx");
const publicFooter = readProjectFile("src/components/PublicFooter.tsx");
const rootLayout = readProjectFile("src/app/layout.tsx");

function loginOpeningTags(source: string): string[] {
  return [...source.matchAll(/<(?:Link|a)\b[^>]*\bhref=["']\/login["'][^>]*>/g)].map(
    (match) => match[0],
  );
}

describe("SEC-ADS-ISOLATION", () => {
  it("mantém todas as áreas privadas fora do carregamento do Google Ads", () => {
    for (const prefix of [
      '"/admin"',
      '"/cuidador"',
      '"/familia"',
      '"/login"',
      '"/esqueci-senha"',
      '"/redefinir-senha"',
    ]) {
      expect(adsTag).toContain(prefix);
    }

    expect(adsTag).toContain("if (!pathname || isPrivateRoute(pathname)) {");
    expect(adsTag).toContain("cleanupGoogleAds();");
    expect(adsTag).toContain("return null;");
    expect(rootLayout).toContain("<GoogleAdsTag />");
  });

  it("identifica e remove os scripts e o estado global próprios do Google Ads", () => {
    expect(adsTag).toContain('const GOOGLE_ADS_EXTERNAL_SCRIPT_ID = "vellora-google-ads-external";');
    expect(adsTag).toContain('const GOOGLE_ADS_INLINE_SCRIPT_ID = "vellora-google-ads-inline";');
    expect(adsTag).toContain('const GOOGLE_ADS_SCRIPT_MARKER = "data-vellora-google-ads";');
    expect(adsTag).toContain("document.querySelectorAll(`script[${GOOGLE_ADS_SCRIPT_MARKER}]`)");
    expect(adsTag).toContain("script.remove()");
    expect(adsTag).toContain("window.gtag = undefined;");
    expect(adsTag).toContain("window.dataLayer = undefined;");
    expect(adsTag).toContain("window.__velloraGoogleAdsBlocked = true;");
    expect(adsTag).toContain('data-vellora-google-ads="external"');
    expect(adsTag).toContain('data-vellora-google-ads="inline"');
    expect(adsTag).toContain(
      "if (!window.__velloraGoogleAdsInitialized && !window.__velloraGoogleAdsBlocked) {",
    );
  });

  it("mantém a inicialização pública protegida contra estado residual privado", () => {
    expect(adsTag).toContain("if (window.__velloraGoogleAdsBlocked || window.__velloraGoogleAdsInitialized) return;");
    expect(adsTag).toContain("window.__velloraGoogleAdsBlocked = false;");
    expect(adsTag).toContain("initializeGoogleAds();");
  });

  it("usa navegação de documento completo somente nos acessos para login", () => {
    const navLoginTags = loginOpeningTags(publicNav);
    const footerLoginTags = loginOpeningTags(publicFooter);

    expect(navLoginTags).toHaveLength(2);
    expect(navLoginTags.every((tag) => /^<a\b/.test(tag))).toBe(true);
    expect(footerLoginTags).toHaveLength(1);
    expect(footerLoginTags[0]).toMatch(/^<a\b/);

    expect(publicNav).toContain('href="/trabalhe-conosco"');
    expect(publicNav).toContain('href="/solicitar-cuidado"');
    expect(publicFooter).toContain('<Link href="/trabalhe-conosco"');
    expect(loginOpeningTags(publicFooter).every((tag) => /^<a\b/.test(tag))).toBe(true);
  });
});
