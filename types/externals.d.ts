declare module '@rneui/themed' {
  export const Button: any;
  export const Input: any;
}

declare module 'react-native-document-picker' {
  const DocumentPicker: any;
  export default DocumentPicker;
  export const isCancel: any;
  export const isInProgress: any;
  export const types: any;
}

declare module 'expo-sqlite/next' {
  export const openDatabaseSync: any;
  export type SQLiteDatabase = any;
  const _default: any;
  export default _default;
}
