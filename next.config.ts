import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Postgres drivers must stay outside the bundle: `postgres` is a normal
  // Node package and @electric-sql/pglite ships WebAssembly + a websocket
  // shim, which only exists for the local development fallback.
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
};

export default nextConfig;
