// Google Tag Manager, mirroring katerberg/website: only loaded in production builds,
// with the container ID supplied by .env.production.

declare global {
  interface Window {
    dataLayer: unknown[];
  }
}

export function initAnalytics(gtmId: string | undefined = import.meta.env.VITE_GTM_ID) {
  if (!import.meta.env.PROD || !gtmId) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
}
