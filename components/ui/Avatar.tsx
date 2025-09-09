import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function Avatar({ name, imageUri, size = 48 }: { name: string; imageUri?: string | null; size?: number }) {
  const initials = (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (imageUri) {
    return <Image source={{ uri: imageUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}> 
      <Text style={{ color: '#000', fontWeight: '800', fontSize: Math.max(12, size * 0.4) }}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#00f5ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

