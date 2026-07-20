module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo", "nativewind/babel"],
    // Keep startup independent from Reanimated JSI/worklets; navigation uses RN Animated.
    plugins: [],
  };
};
