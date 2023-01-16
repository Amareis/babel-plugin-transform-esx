module.exports = (api) => ({
  plugins: [
    [
      "./dist/index.js",
      {
        polyfill: api.cache.using(() => Boolean(process.env.IMPORT_ESTOKEN))
          ? "import"
          : "inline",
      },
    ],
  ],
});
