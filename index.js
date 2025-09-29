// Required for react-native-gesture-handler
import 'react-native-gesture-handler';
// Ensure RN core installed before Router entry.
import 'react-native/Libraries/Core/InitializeCore';
// Polyfills before app entry
import './polyfills/promiseAllSettled';
import 'expo-router/entry';
