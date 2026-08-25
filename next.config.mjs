/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Binário nativo (.node): não empacotar, resolver como require no servidor.
  serverExternalPackages: ["@node-rs/argon2"],
  images: {
    // Thumbnails de vídeo virão do storage (R2 em prod). Ajustar em fases posteriores.
    remotePatterns: [],
  },
};

export default nextConfig;
