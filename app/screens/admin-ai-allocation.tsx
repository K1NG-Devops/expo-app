import React from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet } from 'react-native'

import AllocationManagementScreen from '@/components/ai/AllocationManagementScreen'
import { Colors } from '@/constants/Colors'
import { RoleBasedHeader } from '@/components/RoleBasedHeader'
import { navigateBack } from '@/lib/navigation'

export default function AdminAIAllocationScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="auto" />
      
      <RoleBasedHeader
        title="AI Quota Management"
        leftAction={{ type: 'back', onPress: () => navigateBack() }}
      />
      
      <AllocationManagementScreen />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
})
