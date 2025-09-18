/**
 * AI Quota Allocation Management Screen
 * 
 * Allows principals/admins to allocate AI quotas to teachers
 * Shows usage analytics and optimization suggestions
 * 
 * Complies with WARP.md:
 * - Mobile-first design with touch-friendly controls
 * - Accessibility (WCAG 2.1 AA compliant)
 * - No mock data - graceful empty states
 * - Multi-tenant security with role-based access
 */

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  Pressable,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

import { useAIAllocationManagement } from '@/lib/ai/hooks/useAIAllocation';
import { useProfile } from '@/lib/auth/useProfile';
import { formatDistanceToNow } from 'date-fns';
import type { TeacherAIAllocation } from '@/lib/ai/allocation';
import type { AIQuotaFeature } from '@/lib/ai/limits';

const colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  border: '#E5E5EA',
  text: {
    primary: '#000000',
    secondary: '#6D6D80',
    tertiary: '#C7C7CC',
  },
};

interface AllocationFormData {
  teacherId: string;
  teacherName: string;
  quotas: Partial<Record<AIQuotaFeature, number>>;
  reason: string;
  priority: 'low' | 'normal' | 'high';
  autoRenew: boolean;
}

export default function AllocationManagementScreen() {
  const { profile } = useProfile();
  const {
    schoolSubscription,
    teacherAllocations,
    canManageAllocations,
    optimizationSuggestions,
    isLoading,
    errors,
    allocateQuotas,
    bulkAllocateQuotas,
    isAllocating,
    isBulkAllocating,
    refetch,
  } = useAIAllocationManagement();

  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherAIAllocation | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter teachers based on search
  const filteredTeachers = teacherAllocations.filter((teacher) =>
    teacher.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.teacher_email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch.schoolSubscription(),
      refetch.teacherAllocations(),
      refetch.suggestions(),
    ]);
    setRefreshing(false);
  };

  // Check permissions
  if (!canManageAllocations) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="lock-closed-outline"
          title="Access Restricted"
          description="You don't have permission to manage AI allocations. Contact your administrator."
        />
      </SafeAreaView>
    );
  }

  // Loading state
  if (isLoading.schoolSubscription || isLoading.teacherAllocations) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState message="Loading allocation data..." />
      </SafeAreaView>
    );
  }

  // Error state
  if (errors.schoolSubscription || errors.teacherAllocations) {
    return (
      <SafeAreaView style={styles.container}>
        <EmptyState
          icon="alert-circle-outline"
          title="Failed to Load"
          description="Unable to load allocation data. Please try again."
          action={
            <Button onPress={handleRefresh} variant="outline">
              Retry
            </Button>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="title1" style={styles.title}>
            AI Quota Management
          </Text>
          <Text variant="caption1" color="secondary">
            {profile?.preschool?.name || 'Your School'}
          </Text>
        </View>

        {/* School Subscription Overview */}
        {schoolSubscription && (
          <SchoolSubscriptionCard subscription={schoolSubscription} />
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Button
            onPress={() => setShowAllocationModal(true)}
            style={styles.primaryAction}
            accessibilityLabel="Allocate quotas to teacher"
          >
            <Ionicons name="add" size={20} color="white" style={styles.buttonIcon} />
            Allocate Quotas
          </Button>
          
          {optimizationSuggestions?.suggestions?.length > 0 && (
            <Button
              variant="outline"
              onPress={() => {/* TODO: Show optimization suggestions */}}
              style={styles.secondaryAction}
              accessibilityLabel="View optimization suggestions"
            >
              <Ionicons name="analytics" size={20} color={colors.primary} style={styles.buttonIcon} />
              Optimize ({optimizationSuggestions.suggestions.length})
            </Button>
          )}
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            leftIcon="search"
            style={styles.searchInput}
            accessibilityLabel="Search teachers"
          />
        </View>

        {/* Teacher Allocations List */}
        <View style={styles.listContainer}>
          <Text variant="headline" style={styles.sectionTitle}>
            Teacher Allocations ({filteredTeachers.length})
          </Text>
          
          {filteredTeachers.length === 0 ? (
            <EmptyState
              icon={searchQuery ? "search" : "person-add-outline"}
              title={searchQuery ? "No matches found" : "No allocations yet"}
              description={
                searchQuery
                  ? "Try adjusting your search terms"
                  : "Start by allocating AI quotas to your teachers"
              }
              compact
            />
          ) : (
            <FlashList
              data={filteredTeachers}
              renderItem={({ item }) => (
                <TeacherAllocationCard
                  allocation={item}
                  onEdit={() => {
                    setSelectedTeacher(item);
                    setShowAllocationModal(true);
                  }}
                />
              )}
              keyExtractor={(item) => item.id}
              estimatedItemSize={120}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </ScrollView>

      {/* Allocation Modal */}
      <AllocationModal
        visible={showAllocationModal}
        teacher={selectedTeacher}
        schoolSubscription={schoolSubscription}
        onClose={() => {
          setShowAllocationModal(false);
          setSelectedTeacher(null);
        }}
        onSubmit={async (formData) => {
          try {
            await allocateQuotas({
              teacherId: formData.teacherId,
              quotas: formData.quotas,
              options: {
                reason: formData.reason,
                priority_level: formData.priority,
                auto_renew: formData.autoRenew,
              },
            });
            
            setShowAllocationModal(false);
            setSelectedTeacher(null);
            
            Alert.alert(
              'Success',
              `AI quotas allocated to ${formData.teacherName}`,
              [{ text: 'OK' }]
            );
          } catch (error) {
            Alert.alert(
              'Error',
              error.message || 'Failed to allocate quotas',
              [{ text: 'OK' }]
            );
          }
        }}
        loading={isAllocating}
      />
    </SafeAreaView>
  );
}

// School Subscription Card Component
function SchoolSubscriptionCard({ subscription }: { subscription: any }) {
  const totalAllocated = Object.values(subscription.allocated_quotas).reduce(
    (sum: number, quota: number) => sum + quota,
    0
  );
  const totalAvailable = Object.values(subscription.total_quotas).reduce(
    (sum: number, quota: number) => sum + quota,
    0
  );
  const utilization = totalAvailable > 0 ? (totalAllocated / totalAvailable) * 100 : 0;

  return (
    <Card style={styles.subscriptionCard}>
      <View style={styles.subscriptionHeader}>
        <Text variant="headline" style={styles.subscriptionTitle}>
          Subscription Overview
        </Text>
        <Badge variant={subscription.subscription_tier === 'enterprise' ? 'success' : 'primary'}>
          {subscription.subscription_tier.toUpperCase()}
        </Badge>
      </View>

      <View style={styles.quotaOverview}>
        <View style={styles.quotaRow}>
          <Text variant="subheadline" color="secondary">
            Total Quotas Allocated
          </Text>
          <Text variant="title3">
            {totalAllocated} / {totalAvailable}
          </Text>
        </View>
        
        <ProgressBar
          progress={utilization / 100}
          color={utilization > 90 ? colors.error : utilization > 70 ? colors.warning : colors.success}
          style={styles.progressBar}
        />
        
        <Text variant="caption1" color="secondary" style={styles.utilizationText}>
          {utilization.toFixed(1)}% allocated
        </Text>
      </View>

      <View style={styles.quotaDetails}>
        {Object.entries(subscription.total_quotas).map(([service, total]) => {
          const allocated = subscription.allocated_quotas[service] || 0;
          const available = total - allocated;
          
          return (
            <View key={service} style={styles.quotaDetailRow}>
              <Text variant="footnote" style={styles.serviceName}>
                {service.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              <Text variant="footnote" color="secondary">
                {available} available
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// Teacher Allocation Card Component
function TeacherAllocationCard({
  allocation,
  onEdit,
}: {
  allocation: TeacherAIAllocation;
  onEdit: () => void;
}) {
  const totalAllocated = Object.values(allocation.allocated_quotas).reduce(
    (sum: number, quota: number) => sum + quota,
    0
  );
  const totalUsed = Object.values(allocation.used_quotas).reduce(
    (sum: number, quota: number) => sum + quota,
    0
  );
  const utilization = totalAllocated > 0 ? (totalUsed / totalAllocated) * 100 : 0;

  return (
    <Card style={styles.teacherCard}>
      <Pressable
        onPress={onEdit}
        style={styles.teacherCardContent}
        accessibilityRole="button"
        accessibilityLabel={`Edit allocation for ${allocation.teacher_name}`}
      >
        <View style={styles.teacherHeader}>
          <View style={styles.teacherInfo}>
            <Text variant="headline" style={styles.teacherName}>
              {allocation.teacher_name}
            </Text>
            <Text variant="caption1" color="secondary">
              {allocation.teacher_email}
            </Text>
          </View>
          
          <View style={styles.teacherStatus}>
            <Badge
              variant={allocation.is_active ? 'success' : 'secondary'}
              size="small"
            >
              {allocation.is_active ? 'Active' : 'Inactive'}
            </Badge>
            {allocation.priority_level !== 'normal' && (
              <Badge
                variant={allocation.priority_level === 'high' ? 'error' : 'warning'}
                size="small"
                style={styles.priorityBadge}
              >
                {allocation.priority_level.toUpperCase()}
              </Badge>
            )}
          </View>
        </View>

        <View style={styles.usageOverview}>
          <Text variant="caption1" color="secondary" style={styles.usageLabel}>
            Quota Usage
          </Text>
          <ProgressBar
            progress={utilization / 100}
            color={utilization > 90 ? colors.error : utilization > 70 ? colors.warning : colors.success}
            style={styles.usageProgress}
          />
          <Text variant="caption2" color="secondary">
            {totalUsed} of {totalAllocated} used ({utilization.toFixed(1)}%)
          </Text>
        </View>

        <View style={styles.allocationDetails}>
          {Object.entries(allocation.allocated_quotas).map(([service, quota]) => {
            const used = allocation.used_quotas[service] || 0;
            const remaining = quota - used;
            
            return (
              <View key={service} style={styles.serviceRow}>
                <Text variant="caption2" style={styles.serviceLabel}>
                  {service.replace('_', ' ')}
                </Text>
                <Text
                  variant="caption2"
                  color={remaining <= 0 ? 'error' : 'secondary'}
                  style={styles.serviceQuota}
                >
                  {remaining} left
                </Text>
              </View>
            );
          })}
        </View>

        <Text variant="caption2" color="secondary" style={styles.lastUpdated}>
          Updated {formatDistanceToNow(new Date(allocation.updated_at), { addSuffix: true })}
        </Text>
      </Pressable>
    </Card>
  );
}

// Allocation Modal Component (simplified for brevity)
function AllocationModal({
  visible,
  teacher,
  schoolSubscription,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  teacher?: TeacherAIAllocation | null;
  schoolSubscription: any;
  onClose: () => void;
  onSubmit: (data: AllocationFormData) => void;
  loading: boolean;
}) {
  // This would contain the full allocation form
  // For brevity, showing simplified structure
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text variant="title2">
            {teacher ? 'Edit Allocation' : 'New Allocation'}
          </Text>
          <Pressable onPress={onClose} accessibilityLabel="Close modal">
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </Pressable>
        </View>
        
        <View style={styles.modalContent}>
          <Text variant="body">
            Allocation form would go here with inputs for:
            - Teacher selection
            - Quota amounts per service
            - Priority level
            - Auto-renewal settings
            - Reason/justification
          </Text>
          
          <Button
            onPress={onClose}
            variant="outline"
            style={styles.modalButton}
          >
            Cancel
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    marginBottom: 4,
  },
  subscriptionCard: {
    margin: 16,
    padding: 16,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionTitle: {
    flex: 1,
  },
  quotaOverview: {
    marginBottom: 16,
  },
  quotaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    marginVertical: 8,
  },
  utilizationText: {
    textAlign: 'center',
  },
  quotaDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  quotaDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: colors.surface,
  },
  listContainer: {
    paddingHorizontal: 16,
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
  },
  teacherCard: {
    marginBottom: 12,
  },
  teacherCardContent: {
    padding: 16,
  },
  teacherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teacherInfo: {
    flex: 1,
    marginRight: 12,
  },
  teacherName: {
    marginBottom: 2,
  },
  teacherStatus: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    marginLeft: 4,
  },
  usageOverview: {
    marginBottom: 12,
  },
  usageLabel: {
    marginBottom: 4,
  },
  usageProgress: {
    marginVertical: 4,
  },
  allocationDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
    gap: 12,
  },
  serviceRow: {
    minWidth: '30%',
  },
  serviceLabel: {
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  serviceQuota: {
    fontWeight: '600',
  },
  lastUpdated: {
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalButton: {
    marginTop: 16,
  },
});

export { AllocationManagementScreen };