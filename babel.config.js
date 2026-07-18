module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-transform-private-methods',
      '@babel/plugin-transform-class-properties',
      ...(process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production' 
        ? ['transform-remove-console'] 
        : [])
    ],
  };
};
