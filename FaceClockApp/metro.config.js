// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Optimize bundle size for production
config.transformer = {
  ...config.transformer,
  // Enable minification
  minifierPath: require.resolve('metro-minify-terser'),
  minifierConfig: {
    // Remove console statements in production
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
    },
    // Optimize output
    output: {
      comments: false,
      ascii_only: true,
    },
  },
  // Enable inline requires for better tree shaking
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Optimize resolver for smaller bundles
config.resolver = {
  ...config.resolver,
  // Keep all necessary file extensions (don't remove json as it's needed)
  // Exclude unnecessary platforms if needed
  platforms: ['ios', 'android', 'native', 'web'],
};

// Optimize serializer for production
config.serializer = {
  ...config.serializer,
  // Custom serializer options for smaller bundles
  customSerializer: config.serializer.customSerializer,
};

module.exports = config;

