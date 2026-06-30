import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  // Hide the on-screen dev indicator (dev-only; never shown in production).
  devIndicators: false,
};

export default withNextIntl(nextConfig);
