/**
 * Activity Detail Screen
 * 
 * Complete activity feed with filtering, search, and administrative controls.
 * Designed with Principal -> Teacher -> Parent hierarchy in mind:
 * - Principals see all school activity with management controls
 * - Teachers see classroom-specific activity 
 * - Parents see student-specific activity
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { CacheIndicator } from '@/components/ui/CacheIndicator';
import { EmptyActivityState } from '@/components/ui/EmptyState';
import { offlineCacheService } from '@/lib/services/offlineCacheService';

interface ActivityItem {
  id: string;
  type: 'enrollment' | 'payment' | 'teacher' | 'meeting' | 'attendance' | 'system' | 'announcement';
  title: string;
  description: string;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
  actorName?: string;
  actorRole?: 'principal' | 'teacher' | 'parent' | 'system';
  schoolId?: string;
  metadata?: Record<string, any>;
}

interface FilterOptions {
  type: string[];
  priority: string[];
  timeRange: 'today' | 'week' | 'month' | 'all';
  search: string;
}

export default function ActivityDetailScreen() {
  const { user, profile } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);

  const [filters, setFilters] = useState<FilterOptions>({
    type: [],
    priority: [],
    timeRange: 'week',
    search: '',
  });

  // Mock activity data with proper hierarchy consideration
  const generateMockActivities = (): ActivityItem[] => {
    const userRole = profile?.role || 'parent';
    const schoolId = profile?.organization_id || 'school-123';
    
    const baseActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'enrollment',
        title: 'New Student Enrolled',
        description: 'Sarah Johnson enrolled in Grade R-A',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        priority: 'high',
        icon: 'person-add',
        color: '#4F46E5',
        actorName: 'Principal Smith',
        actorRole: 'principal',
        schoolId,
        metadata: { studentName: 'Sarah Johnson', grade: 'Grade R-A' }
      },
      {
        id: '2',
        type: 'payment',
        title: 'Payment Received',
        description: 'Monthly fee payment of R1,200 received',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
        priority: 'medium',
        icon: 'card',
        color: '#059669',
        actorName: 'Financial System',
        actorRole: 'system',
        schoolId,
        metadata: { amount: 1200, currency: 'ZAR' }
      },
      {
        id: '3',
        type: 'teacher',
        title: 'Teacher Assignment Updated',
        description: 'Ms. Davis assigned to Grade 1-B',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        priority: 'medium',
        icon: 'school',
        color: '#DC2626',
        actorName: 'Principal Smith',
        actorRole: 'principal',
        schoolId,
        metadata: { teacherName: 'Ms. Davis', class: 'Grade 1-B' }
      },
      {
        id: '4',
        type: 'announcement',
        title: 'School Announcement',
        description: 'Sports Day scheduled for next Friday',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
        priority: 'high',
        icon: 'megaphone',
        color: '#7C3AED',
        actorName: 'Principal Smith',
        actorRole: 'principal',
        schoolId,
        metadata: { eventDate: '2025-09-18', eventType: 'Sports Day' }
      },
      {
        id: '5',
        type: 'meeting',
        title: 'Parent-Teacher Meeting',
        description: 'Scheduled meeting for Grade R parents',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        priority: 'medium',
        icon: 'people',
        color: '#EA580C',
        actorName: 'Ms. Johnson',
        actorRole: 'teacher',
        schoolId,
        metadata: { grade: 'Grade R', meetingType: 'Parent-Teacher Conference' }
      },
      {
        id: '6',
        type: 'attendance',
        title: 'Attendance Report',
        description: '95% attendance rate for this week',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        priority: 'low',
        icon: 'checkmark-circle',
        color: '#059669',
        actorName: 'Attendance System',
        actorRole: 'system',
        schoolId,
        metadata: { attendanceRate: 95, period: 'week' }
      }
    ];

    // Filter based on user role and permissions
    if (userRole === 'principal_admin') {
      return baseActivities; // Principals see everything
    } else if (userRole === 'teacher') {
      // Teachers see classroom-specific activities
      return baseActivities.filter(activity => 
        activity.type === 'attendance' || 
        activity.type === 'meeting' || 
        activity.actorRole === 'teacher' ||
        activity.metadata?.grade?.includes('Grade R') // Example: teacher's assigned grade
      );
    } else {
      // Parents see student-specific activities
      return baseActivities.filter(activity => 
        activity.type === 'announcement' ||
        activity.type === 'meeting' ||
        activity.metadata?.studentName === 'Sarah Johnson' // Example: parent's child
      );
    }
  };

  const loadActivities = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh);
      if (forceRefresh) setRefreshing(true);

      const userRole = profile?.role || 'parent';
      const schoolId = profile?.organization_id || 'school-123';

      // Try cache first
      if (!forceRefresh && user?.id) {
        setIsLoadingFromCache(true);
        const cached = await offlineCacheService.getActivityFeed(
          schoolId,
          user.id,
          userRole === 'principal_admin' ? 'school' : 'class'
        );
        
        if (cached) {
          setActivities(cached);
          setIsLoadingFromCache(false);
          // Continue to fetch fresh data in background
          setTimeout(() => loadActivities(true), 100);
          return;
        }
        setIsLoadingFromCache(false);
      }

      // In production, this would be a real Supabase query with proper RLS
      // For now, using mock data with proper hierarchy
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      const mockActivities = generateMockActivities();
      setActivities(mockActivities);

      // Cache the fresh data
      if (user?.id) {
        await offlineCacheService.cacheActivityFeed(
          schoolId,
          user.id,
          mockActivities,
          userRole === 'principal_admin' ? 'school' : 'class'
        );
      }

    } catch (error) {
      console.error('Failed to load activities:', error);
      Alert.alert('Error', 'Failed to load activity feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [activities, filters]);

  const applyFilters = () => {
    let filtered = activities;

    // Filter by type
    if (filters.type.length > 0) {
      filtered = filtered.filter(activity => filters.type.includes(activity.type));
    }

    // Filter by priority
    if (filters.priority.length > 0) {
      filtered = filtered.filter(activity => filters.priority.includes(activity.priority));
    }

    // Filter by time range
    const now = new Date();
    switch (filters.timeRange) {
      case 'today':
        filtered = filtered.filter(activity => {
          const activityDate = new Date(activity.timestamp);
          return activityDate.toDateString() === now.toDateString();
        });
        break;
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(activity => 
          new Date(activity.timestamp) >= weekAgo
        );
        break;
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(activity => 
          new Date(activity.timestamp) >= monthAgo
        );
        break;
      }
      // 'all' shows everything
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchLower) ||
        activity.description.toLowerCase().includes(searchLower) ||
        activity.actorName?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setFilteredActivities(filtered);
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#DC2626';
      case 'medium': return '#EA580C';
      case 'low': return '#059669';
      default: return '#6B7280';
    }
  };

  const canManageActivity = (): boolean => {
    return profile?.role === 'principal_admin';
  };

  const handleDeleteActivity = (activityId: string) => {
    if (!canManageActivity()) {
      Alert.alert('Access Denied', 'Only principals can delete activities.');
      return;
    }

    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setActivities(prev => prev.filter(a => a.id !== activityId));
            // In production, this would call the delete API
          }
        }
      ]
    );
  };

  const renderActivityItem = ({ item }: { item: ActivityItem }) => (
    <TouchableOpacity style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityIconContainer}>
          <Ionicons name={item.icon as any} size={20} color={item.color} />
        </View>
        <View style={styles.activityContent}>
          <View style={styles.activityTitleRow}>
            <Text style={styles.activityTitle}>{item.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) + '20' }]}>
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {item.priority}
              </Text>
            </View>
          </View>
          <Text style={styles.activityDescription}>{item.description}</Text>
          <View style={styles.activityMeta}>
            <Text style={styles.activityTime}>{formatTimeAgo(item.timestamp)}</Text>
            {item.actorName && (
              <>
                <Text style={styles.activityDivider}>•</Text>
                <Text style={styles.activityActor}>{item.actorName}</Text>
              </>
            )}
          </View>
        </View>
        {canManageActivity() && (
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteActivity(item.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Activities</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Activity Type</Text>
            <View style={styles.filterOptions}>
              {['enrollment', 'payment', 'teacher', 'meeting', 'announcement', 'attendance'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterOption, filters.type.includes(type) && styles.filterOptionSelected]}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      type: prev.type.includes(type)
                        ? prev.type.filter(t => t !== type)
                        : [...prev.type, type]
                    }));
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.type.includes(type) && styles.filterOptionTextSelected
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Time Range</Text>
            <View style={styles.filterOptions}>
              {[
                { key: 'today', label: 'Today' },
                { key: 'week', label: 'This Week' },
                { key: 'month', label: 'This Month' },
                { key: 'all', label: 'All Time' }
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterOption, filters.timeRange === key && styles.filterOptionSelected]}
                  onPress={() => setFilters(prev => ({ ...prev, timeRange: key as any }))}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.timeRange === key && styles.filterOptionTextSelected
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => setFilters({ type: [], priority: [], timeRange: 'week', search: '' })}
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyFiltersButton}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getActiveFiltersCount = (): number => {
    return filters.type.length + filters.priority.length + 
           (filters.timeRange !== 'week' ? 1 : 0) + 
           (filters.search ? 1 : 0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Activity Feed</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="filter" size={20} color={Colors.light.tint} />
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Cache Indicator */}
      <CacheIndicator 
        isLoadingFromCache={isLoadingFromCache}
        onRefresh={() => loadActivities(true)}
        compact={true}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.tabIconDefault} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          value={filters.search}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
          placeholderTextColor={Colors.light.tabIconDefault}
        />
      </View>

      {/* Activities List */}
      <FlatList
        data={filteredActivities}
        renderItem={renderActivityItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadActivities(true)} />
        }
        ListEmptyComponent={() => (
          loading ? null : <EmptyActivityState />
        )}
        showsVerticalScrollIndicator={false}
      />

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  filterButton: {
    padding: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.light.text,
  },
  listContent: {
    padding: 16,
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityDescription: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 6,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTime: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  activityDivider: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginHorizontal: 6,
  },
  activityActor: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  filterSection: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterOptionSelected: {
    backgroundColor: Colors.light.tint + '20',
    borderColor: Colors.light.tint,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  filterOptionTextSelected: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.tabIconDefault,
    alignItems: 'center',
  },
  clearFiltersText: {
    color: Colors.light.tabIconDefault,
    fontSize: 16,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
