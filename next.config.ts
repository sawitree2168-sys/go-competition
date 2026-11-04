import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Posters may also live in the project's public Supabase Storage buckets.
    remotePatterns: [new URL("https://bqyokjwuxyzyiripijbs.supabase.co/storage/v1/object/public/**")],
  },
};

export default nextConfig;
