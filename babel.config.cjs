module.exports = (api) => ({
  plugins: [
    [
      "./dist/plugin.js",
      {
        polyfill: api.cache.using(() => Boolean(process.env.IMPORT_ESTOKEN))
          ? "import"
          : "inline",
      },
    ],
  ],
});
