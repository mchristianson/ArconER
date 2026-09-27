import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // History lives on the home page now; keep old links working.
  redirects: async () => [{ source: "/history", destination: "/#history", permanent: true }],
};

export default nextConfig;
