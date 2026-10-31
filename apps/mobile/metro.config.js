const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const workspaceRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

// npm workspaces: watch shared packages and resolve hoisted dependencies from the repo root.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'glb'])];

// R3F Native resolves the CommonJS build while addons resolve the ESM build.
// Force both through one Three.js module so loader polyfills and renderer share state.
const threeModulePath = path.join(path.dirname(require.resolve('three')), 'three.module.js');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: threeModulePath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
