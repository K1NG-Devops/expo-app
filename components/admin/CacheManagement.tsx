/**
 * Cache Management Component
 * 
 * Provides administrators (especially Principals) with tools to monitor
 * and manage offline cache across their school's data.
 * 
 * Features:
 * - Cache statistics and health monitoring
 * - Selective cache clearing for school data
 * - Cache size optimization tools
 * - Debug information for troubleshooting
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { offlineCacheService } from '@/lib/services/offlineCacheService';

interface CacheStats {
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
  newestEntry: number;
  hitRate: number;
}

interface CacheManagementProps {
  onClose: () => void;
  schoolId?: string;
}

export const CacheManagement: React.FC<CacheManagementProps> = ({
  onClose,
  schoolId
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const cacheStats = await offlineCacheService.getCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number): string => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClearUserCache = () => {
    Alert.alert(
      'Clear Personal Cache',
      'This will clear all cached data for your account. You may experience slower loading times until data is cached again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            
            setClearing(true);
            try {
              await offlineCacheService.clearUserCache(user.id);
              Alert.alert('Success', 'Personal cache cleared successfully');
              await loadStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
              console.error('Failed to clear user cache:', error);
            } finally {
              setClearing(false);
            }
          }
        }
      ]
    );
  };

  const handleClearSchoolCache = () => {
    if (!schoolId || !user?.id) {
      Alert.alert('Error', 'School information not available');
      return;
    }

    Alert.alert(
      'Clear School Cache',
      'This will clear all cached data for your entire school. All staff members will experience slower loading times until data is cached again. This action should only be performed if you are experiencing data synchronization issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear School Cache',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await offlineCacheService.clearSchoolCache(schoolId, user.id);
              Alert.alert('Success', 'School cache cleared successfully');
              await loadStats();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear school cache');
              console.error('Failed to clear school cache:', error);
            } finally {
              setClearing(false);
            }
          }
        }
      ]
    );
  };

  const getHealthStatus = (): { status: 'good' | 'warning' | 'critical', message: string } => {
    if (!stats) return { status: 'warning', message: 'Unable to determine status' };

    if (stats.totalSize > 8 * 1024 * 1024) { // > 8MB
      return { status: 'critical', message: 'Cache size is very large' };
    } else if (stats.totalSize > 5 * 1024 * 1024) { // > 5MB
      return { status: 'warning', message: 'Cache size is moderate' };
    } else if (stats.hitRate < 0.3) { // < 30% hit rate
      return { status: 'warning', message: 'Low cache efficiency' };
    }
    
    return { status: 'good', message: 'Cache operating efficiently' };
  };

  const health = getHealthStatus();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cache Management</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.tint} />
            <Text style={styles.loadingText}>Loading cache statistics...</Text>
          </View>
        ) : (
          <>
            {/* Health Status */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={health.status === 'good' ? 'checkmark-circle' : health.status === 'warning' ? 'warning' : 'alert-circle'} 
                  size={20} 
                  color={health.status === 'good' ? '#059669' : health.status === 'warning' ? '#EA580C' : '#DC2626'} 
                />
                <Text style={styles.sectionTitle}>Cache Health</Text>
              </View>
              <View style={[styles.healthBadge, { 
                backgroundColor: health.status === 'good' ? '#059669' : health.status === 'warning' ? '#EA580C' : '#DC2626' 
              }]}>
                <Text style={styles.healthText}>{health.message}</Text>
              </View>
            </View>

            {/* Statistics */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bar-chart" size={20} color={Colors.light.tint} />
                <Text style={styles.sectionTitle}>Statistics</Text>
              </View>
              
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{formatBytes(stats?.totalSize || 0)}</Text>
                  <Text style={styles.statLabel}>Total Size</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats?.entryCount || 0}</Text>
                  <Text style={styles.statLabel}>Cache Entries</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{Math.round((stats?.hitRate || 0) * 100)}%</Text>
                  <Text style={styles.statLabel}>Hit Rate</Text>
                </View>
                
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{formatDate(stats?.newestEntry || 0)}</Text>
                  <Text style={styles.statLabel}>Last Updated</Text>
                </View>
              </View>
            </View>

            {/* Cache Actions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="build" size={20} color={Colors.light.tint} />
                <Text style={styles.sectionTitle}>Cache Management</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleClearUserCache}
                disabled={clearing}
              >
                <Ionicons name="person" size={20} color={Colors.light.tint} />
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Clear Personal Cache</Text>
                  <Text style={styles.actionDescription}>
                    Clear cached data for your account only
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
              </TouchableOpacity>

              {schoolId && (
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleClearSchoolCache}
                  disabled={clearing}
                >
                  <Ionicons name="school" size={20} color="#DC2626" />
                  <View style={styles.actionContent}>
                    <Text style={[styles.actionTitle, { color: '#DC2626' }]}>Clear School Cache</Text>
                    <Text style={styles.actionDescription}>
                      Clear cached data for entire school (Principal only)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={loadStats}
                disabled={clearing}
              >
                <Ionicons name="refresh" size={20} color={Colors.light.tabIconDefault} />
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Refresh Statistics</Text>
                  <Text style={styles.actionDescription}>
                    Reload cache statistics and health status
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
              </TouchableOpacity>
            </View>

            {/* Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle" size={20} color={Colors.light.tabIconDefault} />
                <Text style={styles.sectionTitle}>About Cache</Text>
              </View>
              
              <Text style={styles.infoText}>
                The offline cache stores dashboard data locally on your device for faster loading and offline access. 
                Cache is automatically managed but can be cleared if you experience sync issues.
              </Text>
              
              <Text style={styles.infoText}>
                • Cache expires automatically after 5-10 minutes{'\n'}
                • Data is encrypted and user-specific{'\n'}
                • Maximum cache size is limited to 10MB{'\n'}
                • Cache improves loading speeds by 60-90%
              </Text>
            </View>

            {/* Loading Indicator */}
            {clearing && (
              <View style={styles.clearingOverlay}>
                <ActivityIndicator size="large" color={Colors.light.tint} />
                <Text style={styles.clearingText}>Clearing cache...</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 8,
  },
  healthBadge: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  healthText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  infoText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    lineHeight: 20,
    marginBottom: 12,
  },
  clearingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.text,
    fontWeight: '600',
  },
});
