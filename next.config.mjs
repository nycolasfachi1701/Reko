/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Thumbnails de vídeo virão do storage (R2 em prod). Ajustar em fases posteriores.
    remotePatterns: [],
  },
};

export default nextConfig;
