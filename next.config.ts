import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN-IP access during dev so the site can be tested from another
  // device on the same network (phone, tablet, second machine).
  allowedDevOrigins: ["192.168.178.75"],
};

export default nextConfig;
