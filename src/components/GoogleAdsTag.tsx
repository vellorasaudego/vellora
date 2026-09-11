"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GOOGLE_ADS_ID = "AW-18418885759";
const GOOGLE_ADS_EXTERNAL_SCRIPT_ID = "vellora-google-ads-external";
const GOOGLE_ADS_INLINE_SCRIPT_ID = "vellora-google-ads-inline";
const GOOGLE_ADS_SCRIPT_MARKER = "data-vellora-google-ads";

type GoogleTagCommand = unknown[] | IArguments;

declare global {
  interface Window {
    dataLayer?: GoogleTagCommand[];
    gtag?: (...args: unknown[]) => void;
    __velloraGoogleAdsInitialized?: boolean;
    __velloraGoogleAdsBlocked?: boolean;
  }
}

const PRIVATE_ROUTE_PREFIXES = [
  "/admin",
  "/cuidador",
  "/familia",
  "/login",
  "/esqueci-senha",
  "/redefinir-senha",
] as const;

function isPrivateRoute(pathname: string) {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function initializeGoogleAds() {
  if (window.__velloraGoogleAdsBlocked || window.__velloraGoogleAdsInitialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  window.__velloraGoogleAdsInitialized = true;
}

function cleanupGoogleAds() {
  document.querySelectorAll(`script[${GOOGLE_ADS_SCRIPT_MARKER}]`).forEach((script) => script.remove());
  window.gtag = undefined;
  window.dataLayer = undefined;
  window.__velloraGoogleAdsInitialized = false;
  window.__velloraGoogleAdsBlocked = true;
}

export function GoogleAdsTag() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || isPrivateRoute(pathname)) {
      cleanupGoogleAds();
      return;
    }

    window.__velloraGoogleAdsBlocked = false;
    initializeGoogleAds();
  }, [pathname]);

  if (!pathname || isPrivateRoute(pathname)) return null;

  return (
    <>
      <Script
        id={GOOGLE_ADS_EXTERNAL_SCRIPT_ID}
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
        data-vellora-google-ads="external"
      />
      <Script
        id={GOOGLE_ADS_INLINE_SCRIPT_ID}
        strategy="afterInteractive"
        data-vellora-google-ads="inline"
      >{`
        if (!window.__velloraGoogleAdsInitialized && !window.__velloraGoogleAdsBlocked) {
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}');
          window.__velloraGoogleAdsInitialized = true;
        }
      `}</Script>
    </>
  );
}
