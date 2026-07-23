// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: false },
  modules: ["@nuxt/eslint", "@pinia/nuxt"],
  css: ["~/assets/styles/main.scss", "~/assets/styles/libs/_transitions.scss"],
  ssr: false,
  app: {
    head: {
      title: "Naam",
      htmlAttrs: {
        lang: "fr",
      },
      link: [
        // FONT
        {
          rel: "preload",
          as: "font",
          type: "font/woff2",
          href: "~/assets/fonts/stefan-regular.woff2",
          crossorigin: "anonymous",
        },
        // FAVICON
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon/favicon-96x96.png",
          sizes: "96x96",
        },
        { rel: "icon", type: "image/svg+xml", href: "/favicon/favicon.svg" },
        { rel: "shortcut icon", href: "/favicon/favicon.ico" },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/favicon/apple-touch-icon.png",
        },
        { rel: "manifest", href: "/favicon/site.webmanifest" },
      ],
    },
  },
  vite: {
    css: {
      preprocessorMaxWorkers: true,
      preprocessorOptions: {
        scss: {
          additionalData: `@use "~/assets/styles/libs/_ease.module.scss" as ease;
            @use "~/assets/styles/libs/_global.module.scss" as global;
            @use "~/assets/styles/libs/_grid.module.scss" as grid;
            @use "~/assets/styles/libs/_helpers.module.scss" as helpers;
            @use "~/assets/styles/libs/_mq.module.scss" as mq;
            @use "~/assets/styles/libs/_mx.module.scss" as mx;
            @use "~/assets/styles/libs/_style.module.scss" as style;
          `,
        },
      },
    },
  },
});
