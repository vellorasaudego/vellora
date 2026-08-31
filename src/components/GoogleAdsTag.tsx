"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";

const GOOGLE_ADS_ID = "AW-18418885759";

type GoogleTagCommand = unknown[] | IArguments;

declare global {
  interface Window {
    dataLayer?: GoogleTagCommand[];
    gtag?: (...args: unknown[]) => void;
    __velloraGoogleAdsInitialized?: boolean;
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
  if (window.__velloraGoogleAdsInitialized) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
  window.gtag("js", new Date());
  window.gtag("config", GOOGLE_ADS_ID);
  window.__velloraGoogleAdsInitialized = true;
}

export function GoogleAdsTag() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && !isPrivateRoute(pathname)) initializeGoogleAds();
  }, [pathname]);

  if (!pathname || isPrivateRoute(pathname)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-ads-gtag"
        strategy="afterInteractive"
      >{`
        if (!window.__velloraGoogleAdsInitialized) {
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
