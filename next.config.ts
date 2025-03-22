import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: [
      'uitmalumni.s3.ap-southeast-1.amazonaws.com',
      'img.clerk.com'
    ],
  },
};

export default nextConfig;
