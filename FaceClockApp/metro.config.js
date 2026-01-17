const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const isProduction = process.env.NODE_ENV === 'production';

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: isProduction,
    },
  }),
};

if (isProduction) {
  config.transformer.minifierPath = require.resolve('metro-minify-terser');
  config.transformer.minifierConfig = {
    compress: {
      drop_console: true,
      drop_debugger: true,
    },
    output: {
      comments: false,
      ascii_only: true,
    },
  };
}

config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
};

// Add middleware to handle platform detection for Expo Go compatibility
config.middleware = {
  ...config.middleware,
  handler: (req, res, next) => {
    // Ensure platform header is set for Expo Go
    if (!req.headers['expo-platform'] && !req.headers['exponent-platform']) {
      // Default to 'android' for Expo Go if not specified
      req.headers['expo-platform'] = 'android';
    }
    next();
  }
};

module.exports = config;
