// RevenueCat Integration
export * from './config';
export * from './RevenueCatProvider';

// Conditional type re-exports
try {
  // Re-export commonly used types from react-native-purchases
  const purchases = require('react-native-purchases');
  export type CustomerInfo = typeof purchases.CustomerInfo;
  export type PurchasesEntitlementInfo = typeof purchases.PurchasesEntitlementInfo;
  export type PurchasesOffering = typeof purchases.PurchasesOffering;
  export type PurchasesPackage = typeof purchases.PurchasesPackage;
} catch (error) {
  // Fallback types when package not available
  export type CustomerInfo = any;
  export type PurchasesEntitlementInfo = any;
  export type PurchasesOffering = any;
  export type PurchasesPackage = any;
}
