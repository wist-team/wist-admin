// Keep Metro away from recovered/ — 24 MB of decompiled JS that must never be bundled or watched.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
config.resolver.blockList = [new RegExp(`${path.resolve(__dirname, 'recovered').replace(/[/\\]/g, '[/\\\\]')}[/\\\\].*`)];
config.watchFolders = [__dirname];
module.exports = config;
