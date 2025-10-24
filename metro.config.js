/**
 * metro.config.js - Minimal Metro Configuration
 * 
 * Using Expo's default Metro config with minimal customizations.
 * Expo handles most optimizations automatically.
 * 
 * Only essential customizations:
 * - JSON files as source files (required for i18n locales)
 * 
 * Learn more: https://docs.expo.io/guides/customizing-metro
 */
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Treat JSON files as source files (required for i18n locale imports)
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'json'];

module.exports = config;
