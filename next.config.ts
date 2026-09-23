import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Não divulgar a versão do framework nas respostas
  poweredByHeader: false,
  // O plugin @capacitor-firebase/messaging só corre NATIVO (a app APK); no site
  // nenhuma função do push-app.ts é chamada. A implementação web dele (lazy,
  // nunca executada nos nossos ambientes) importa o SDK JS «firebase/messaging»
  // — pacote que não instalámos. Este alias troca-o por um stub local com os
  // mesmos exports (src/stubs/firebase-messaging-stub.ts), sem peso no bundle
  // e sem risco: no APK corre a ponte nativa; no site o import nunca acontece.
  turbopack: {
    resolveAlias: {
      "firebase/messaging": "./src/stubs/firebase-messaging-stub.ts",
    },
  },
  // Cabeçalhos de segurança para TODAS as rotas (o middleware cobria só /api/*)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // APK alojado no próprio site: descarga directa, sem redireccionamento
        // do GitHub (que em algumas redes móveis trava aos 100% e não conclui).
        // vercel.json repete estes cabeçalhos ao nível da plataforma Vercel.
        source: "/apk/(.*)",
        headers: [
          {
            key: "Content-Type",
            value: "application/vnd.android.package-archive",
          },
          {
            key: "Content-Disposition",
            value: "attachment; filename=MozLit.apk",
          },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
