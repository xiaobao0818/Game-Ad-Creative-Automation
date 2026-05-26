export default defineNuxtConfig({
  ssr: false,
  devtools: { enabled: true },
  app: {
    head: {
      title: '游戏投放素材工坊',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.API_BASE || 'http://localhost:3001/api',
    },
  },
  css: ['~/assets/styles/main.css'],
})
