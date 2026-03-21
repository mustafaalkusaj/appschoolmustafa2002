import type { NextConfig } from "next";
import nextIntl from "next-intl/plugin";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
};

export default nextIntl({
  requestConfig: "./i18n.ts",
})(nextConfig);
