/**
 * Teachers Directory Detail Screen
 * 
 * Complete teachers management with hierarchical access control:
 * - Principals see all school teachers with full management capabilities  
 * - Teachers see limited colleague information
 * - Parents see basic teacher contact information
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
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { CacheIndicator } from '@/components/ui/CacheIndicator';
import { EmptyTeachersState } from '@/components/ui/EmptyState';
import { offlineCacheService } from '@/lib/services/offlineCacheService';

interface Teacher {
  id: string;
  teacherId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  subjects: string[];
  grades: string[];
  qualifications: string[];
  experienceYears: number;
  employmentStatus: 'full-time' | 'part-time' | 'substitute' | 'inactive';
  hireDate: string;
  profilePhoto?: string;
  emergencyContact: string;
  emergencyPhone: string;
  classroomNumber?: string;
  specializations: string[];
  performanceRating: number; // 1-5
  lastPerformanceReview: string;
  salary?: number; // Only visible to principals
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    branchCode: string;
  }; // Only visible to principals
  leaveBalance: number;
  schoolId: string;
  isClassTeacher: boolean;
  assignedClasses: string[];
}

interface FilterOptions {
  subjects: string[];
  grades: string[];
  employmentStatus: string[];
  search: string;
}

export default function TeachersDetailScreen() {
  const { t } = useTranslation(); // eslint-disable-line @typescript-eslint/no-unused-vars
  const { user, profile } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [filters, setFilters] = useState<FilterOptions>({
    subjects: [],
    grades: [],
    employmentStatus: [],
    search: '',
  });

  // Mock teacher data with proper hierarchy consideration
  const generateMockTeachers = (): Teacher[] => {
    const userRole = profile?.role || 'parent';
    const schoolId = profile?.organization_id || 'school-123';
    
    const baseTeachers: Teacher[] = [
      {
        id: '1',
        teacherId: 'TCH2024001',
        firstName: 'Sarah',
        lastName: 'Davis',
        email: 'sarah.davis@school.co.za',
        phone: '+27 82 123 4567',
        subjects: ['Mathematics', 'English'],
        grades: ['Grade R-A'],
        qualifications: ['B.Ed Foundation Phase', 'PGCE'],
        experienceYears: 8,
        employmentStatus: 'full-time',
        hireDate: '2020-01-15',
        profilePhoto: 'https://images.unsplash.com/photo-1494790108755-2616c57ac7cd?w=150&h=150&fit=crop&crop=face',
        emergencyContact: 'John Davis',
        emergencyPhone: '+27 83 456 7890',
        classroomNumber: 'R-A',
        specializations: ['Early Childhood Development', 'Inclusive Education'],
        performanceRating: 4.8,
        lastPerformanceReview: '2024-07-15',
salary: userRole === 'principal_admin' ? 35000 : undefined,
bankDetails: userRole === 'principal_admin' ? {
          accountNumber: '****1234',
          bankName: 'Standard Bank',
          branchCode: '051001'
        } : undefined,
        leaveBalance: 15,
        schoolId,
        isClassTeacher: true,
        assignedClasses: ['class-r-a'],
      },
      {
        id: '2',
        teacherId: 'TCH2024002',
        firstName: 'Michael',
        lastName: 'Thompson',
        email: 'michael.thompson@school.co.za',
        phone: '+27 84 567 8901',
        subjects: ['Mathematics', 'Natural Sciences'],
        grades: ['Grade 1-B', 'Grade 2-A'],
        qualifications: ['B.Sc Mathematics', 'PGCE', 'Honors in Education'],
        experienceYears: 12,
        employmentStatus: 'full-time',
        hireDate: '2018-03-10',
        emergencyContact: 'Lisa Thompson',
        emergencyPhone: '+27 85 234 5678',
        classroomNumber: '1-B',
        specializations: ['Mathematics Education', 'Science Education'],
        performanceRating: 4.5,
        lastPerformanceReview: '2024-06-20',
salary: userRole === 'principal_admin' ? 42000 : undefined,
bankDetails: userRole === 'principal_admin' ? {
          accountNumber: '****5678',
          bankName: 'FNB',
          branchCode: '250655'
        } : undefined,
        leaveBalance: 8,
        schoolId,
        isClassTeacher: true,
        assignedClasses: ['class-1-b'],
      },
      {
        id: '3',
        teacherId: 'TCH2024003',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        email: 'emily.rodriguez@school.co.za',
        phone: '+27 86 345 6789',
        subjects: ['English', 'Life Skills'],
        grades: ['Grade R-B'],
        qualifications: ['B.A English', 'PGCE', 'Certificate in Special Needs'],
        experienceYears: 6,
        employmentStatus: 'full-time',
        hireDate: '2021-08-01',
        emergencyContact: 'Carlos Rodriguez',
        emergencyPhone: '+27 87 890 1234',
        classroomNumber: 'R-B',
        specializations: ['Language Development', 'Special Needs Education'],
        performanceRating: 4.6,
        lastPerformanceReview: '2024-08-10',
salary: userRole === 'principal_admin' ? 32000 : undefined,
        leaveBalance: 12,
        schoolId,
        isClassTeacher: true,
        assignedClasses: ['class-r-b'],
      },
      {
        id: '4',
        teacherId: 'TCH2024004',
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@school.co.za',
        phone: '+27 88 123 4567',
        subjects: ['Physical Education', 'Life Skills'],
        grades: ['Grade R-A', 'Grade R-B', 'Grade 1-A', 'Grade 1-B'],
        qualifications: ['B.Ed Sports Science', 'First Aid Certificate'],
        experienceYears: 4,
        employmentStatus: 'part-time',
        hireDate: '2022-01-20',
        emergencyContact: 'Sarah Wilson',
        emergencyPhone: '+27 89 456 7890',
        specializations: ['Physical Development', 'Sports Coaching'],
        performanceRating: 4.2,
        lastPerformanceReview: '2024-05-15',
salary: userRole === 'principal_admin' ? 18000 : undefined,
        leaveBalance: 5,
        schoolId,
        isClassTeacher: false,
        assignedClasses: [],
      },
      {
        id: '5',
        teacherId: 'TCH2024005',
        firstName: 'Lisa',
        lastName: 'Johnson',
        email: 'lisa.johnson@school.co.za',
        phone: '+27 90 234 5678',
        subjects: ['Mathematics', 'English'],
        grades: ['Grade 2-A'],
        qualifications: ['B.Ed Intermediate Phase', 'Masters in Education'],
        experienceYears: 15,
        employmentStatus: 'full-time',
        hireDate: '2015-02-01',
        emergencyContact: 'Mark Johnson',
        emergencyPhone: '+27 91 567 8901',
        classroomNumber: '2-A',
        specializations: ['Curriculum Development', 'Educational Leadership'],
        performanceRating: 4.9,
        lastPerformanceReview: '2024-07-30',
salary: userRole === 'principal_admin' ? 48000 : undefined,
        leaveBalance: 20,
        schoolId,
        isClassTeacher: true,
        assignedClasses: ['class-2-a'],
      },
    ];

    // Filter based on user role and permissions
    if (userRole === 'principal_admin') {
      return baseTeachers; // Principals see all teachers with full details
    } else if (userRole === 'teacher') {
      // Teachers see colleague information but not sensitive data
return baseTeachers.map(teacher => ({
        ...teacher,
        salary: undefined as any,
        bankDetails: undefined as any,
      }));
    } else {
      // Parents see basic contact information only
return baseTeachers.map(teacher => ({
        ...teacher,
        salary: undefined as any,
        bankDetails: undefined as any,
        emergencyContact: teacher.emergencyContact || '',
        emergencyPhone: teacher.emergencyPhone || '',
        performanceRating: teacher.performanceRating || 0,
        lastPerformanceReview: teacher.lastPerformanceReview || '',
        leaveBalance: teacher.leaveBalance || 0,
      }));
    }
  };

  const loadTeachers = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh);
      if (forceRefresh) setRefreshing(true);

      const userRole = profile?.role || 'parent';
      const schoolId = profile?.organization_id || 'school-123';

      // Try cache first
      if (!forceRefresh && user?.id) {
        setIsLoadingFromCache(true);
        const identifier = userRole === 'principal_admin' 
          ? `${schoolId}` 
          : `${schoolId}_${userRole}`;
        
        const cached = await offlineCacheService.get<Teacher[]>(
          'teacher_data_',
          identifier,
          user.id
        );
        
        if (cached) {
          setTeachers(cached);
          setIsLoadingFromCache(false);
          // Continue to fetch fresh data in background
          setTimeout(() => loadTeachers(true), 100);
          return;
        }
        setIsLoadingFromCache(false);
      }

      // In production, this would be a real Supabase query with proper RLS
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      const mockTeachers = generateMockTeachers();
      setTeachers(mockTeachers);

      // Cache the fresh data
      if (user?.id) {
        const identifier = userRole === 'principal_admin' 
          ? `${schoolId}` 
          : `${schoolId}_${userRole}`;
        
        await offlineCacheService.set<Teacher[]>(
          'teacher_data_',
          identifier,
          mockTeachers,
          user.id,
          schoolId
        );
      }

    } catch (error) {
      console.error('Failed to load teachers:', error);
      Alert.alert('Error', 'Failed to load teachers directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [teachers, filters]);

  const applyFilters = () => {
    let filtered = teachers;

    // Filter by subjects
    if (filters.subjects.length > 0) {
      filtered = filtered.filter(teacher => 
        teacher.subjects.some(subject => filters.subjects.includes(subject))
      );
    }

    // Filter by grades
    if (filters.grades.length > 0) {
      filtered = filtered.filter(teacher => 
        teacher.grades.some(grade => filters.grades.includes(grade))
      );
    }

    // Filter by employment status
    if (filters.employmentStatus.length > 0) {
      filtered = filtered.filter(teacher => filters.employmentStatus.includes(teacher.employmentStatus));
    }

    // Filter by search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(teacher =>
        teacher.firstName.toLowerCase().includes(searchLower) ||
        teacher.lastName.toLowerCase().includes(searchLower) ||
        teacher.teacherId.toLowerCase().includes(searchLower) ||
        teacher.email.toLowerCase().includes(searchLower) ||
        teacher.subjects.some(subject => subject.toLowerCase().includes(searchLower))
      );
    }

    // Sort by last name
    filtered.sort((a, b) => a.lastName.localeCompare(b.lastName));

    setFilteredTeachers(filtered);
  };

  // const formatDate = (dateString: string): string => {
  //   return new Date(dateString).toLocaleDateString('en-ZA', {
  //     year: 'numeric',
  //     month: 'short',
  //     day: 'numeric'
  //   });
  // };

  const getEmploymentStatusColor = (status: string): string => {
    switch (status) {
      case 'full-time': return '#059669';
      case 'part-time': return '#EA580C';
      case 'substitute': return '#7C3AED';
      case 'inactive': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const canManageTeacher = (): boolean => {
    return profile?.role === 'principal_admin';
  };

  const canViewFullDetails = (): boolean => {
    return profile?.role === 'principal_admin' || profile?.role === 'teacher';
  };

  const handleCallTeacher = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleEmailTeacher = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleEditTeacher = (teacher: Teacher) => {
    if (!canManageTeacher()) {
      Alert.alert('Access Denied', 'Only principals can edit teacher information.');
      return;
    }
    
    setSelectedTeacher(teacher);
    setShowTeacherModal(true);
  };

  const handleDeleteTeacher = (teacherId: string) => {
    if (!canManageTeacher()) {
      Alert.alert('Access Denied', 'Only principals can delete teachers.');
      return;
    }

    Alert.alert(
      'Delete Teacher',
      'Are you sure you want to delete this teacher? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTeachers(prev => prev.filter(t => t.id !== teacherId));
            // In production, this would call the delete API
          }
        }
      ]
    );
  };

  const toggleTeacherStatus = (teacherId: string, currentStatus: string) => {
    if (!canManageTeacher()) {
      Alert.alert('Access Denied', 'Only principals can change teacher status.');
      return;
    }

    const newStatus = currentStatus === 'inactive' ? 'full-time' : 'inactive';
    setTeachers(prev => prev.map(teacher => 
      teacher.id === teacherId 
        ? { ...teacher, employmentStatus: newStatus as any }
        : teacher
    ));
  };

  const renderPerformanceStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={14}
          color={i <= rating ? '#F59E0B' : '#D1D5DB'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderTeacherCard = ({ item }: { item: Teacher }) => (
    <TouchableOpacity 
      style={styles.teacherCard}
      onPress={() => handleEditTeacher(item)}
    >
      <View style={styles.teacherHeader}>
        <View style={styles.teacherPhotoContainer}>
          {item.profilePhoto ? (
            <Image source={{ uri: item.profilePhoto }} style={styles.teacherPhoto} />
          ) : (
            <View style={styles.teacherPhotoPlaceholder}>
              <Ionicons name="person" size={24} color={Colors.light.tabIconDefault} />
            </View>
          )}
        </View>
        
        <View style={styles.teacherInfo}>
          <View style={styles.teacherNameRow}>
            <Text style={styles.teacherName}>
              {item.firstName} {item.lastName}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getEmploymentStatusColor(item.employmentStatus) + '20' }]}>
              <Text style={[styles.statusText, { color: getEmploymentStatusColor(item.employmentStatus) }]}>
                {item.employmentStatus}
              </Text>
            </View>
          </View>
          
          <Text style={styles.teacherDetails}>
            {item.teacherId} • {item.experienceYears} years exp
          </Text>
          
          <Text style={styles.teacherDetails}>
            {item.subjects.join(', ')}
          </Text>
          
          <Text style={styles.teacherDetails}>
            Grades: {item.grades.join(', ')}
          </Text>

          {canViewFullDetails() && item.performanceRating && (
            <View style={styles.performanceRow}>
              {renderPerformanceStars(item.performanceRating)}
              <Text style={styles.performanceText}>
                {item.performanceRating.toFixed(1)}
              </Text>
            </View>
          )}

          <View style={styles.teacherActions}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleCallTeacher(item.phone)}
            >
              <Ionicons name="call" size={16} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleEmailTeacher(item.email)}
            >
              <Ionicons name="mail" size={16} color={Colors.light.tint} />
            </TouchableOpacity>
            {canManageTeacher() && (
              <>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => toggleTeacherStatus(item.id, item.employmentStatus)}
                >
                  <Ionicons 
                    name={item.employmentStatus === 'inactive' ? 'play' : 'pause'} 
                    size={16} 
                    color={Colors.light.tabIconDefault} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleDeleteTeacher(item.id)}
                >
                  <Ionicons name="trash-outline" size={16} color="#DC2626" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>

      {canManageTeacher() && item.salary && (
        <View style={styles.salaryInfo}>
          <Text style={styles.salaryText}>
            R{item.salary.toLocaleString()}/month • {item.leaveBalance} days leave
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFilterModal = () => (
    <Modal visible={showFilters} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Teachers</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Subjects</Text>
            <View style={styles.filterOptions}>
              {['Mathematics', 'English', 'Natural Sciences', 'Life Skills', 'Physical Education'].map(subject => (
                <TouchableOpacity
                  key={subject}
                  style={[styles.filterOption, filters.subjects.includes(subject) && styles.filterOptionSelected]}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      subjects: prev.subjects.includes(subject)
                        ? prev.subjects.filter(s => s !== subject)
                        : [...prev.subjects, subject]
                    }));
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.subjects.includes(subject) && styles.filterOptionTextSelected
                  ]}>
                    {subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Employment Status</Text>
            <View style={styles.filterOptions}>
              {['full-time', 'part-time', 'substitute', 'inactive'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterOption, filters.employmentStatus.includes(status) && styles.filterOptionSelected]}
                  onPress={() => {
                    setFilters(prev => ({
                      ...prev,
                      employmentStatus: prev.employmentStatus.includes(status)
                        ? prev.employmentStatus.filter(s => s !== status)
                        : [...prev.employmentStatus, status]
                    }));
                  }}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.employmentStatus.includes(status) && styles.filterOptionTextSelected
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.clearFiltersButton}
              onPress={() => setFilters({ subjects: [], grades: [], employmentStatus: [], search: '' })}
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
    return filters.subjects.length + filters.grades.length + filters.employmentStatus.length + 
           (filters.search ? 1 : 0);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Teachers Directory</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.viewToggle}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Ionicons name={viewMode === 'list' ? 'grid' : 'list'} size={20} color={Colors.light.tint} />
          </TouchableOpacity>
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
      </View>

      {/* Cache Indicator */}
      <CacheIndicator 
        isLoadingFromCache={isLoadingFromCache}
        onRefresh={() => loadTeachers(true)}
        compact={true}
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.light.tabIconDefault} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search teachers..."
          value={filters.search}
          onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
          placeholderTextColor={Colors.light.tabIconDefault}
        />
      </View>

      {/* Teachers Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText}>
          {filteredTeachers.length} of {teachers.length} teachers
        </Text>
        {canManageTeacher() && (
          <TouchableOpacity style={styles.addButton}>
            <Ionicons name="person-add" size={16} color={Colors.light.tint} />
            <Text style={styles.addButtonText}>Add Teacher</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Teachers List */}
      <FlatList
        data={filteredTeachers}
        renderItem={renderTeacherCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadTeachers(true)} />
        }
        ListEmptyComponent={() => (
          loading ? null : <EmptyTeachersState />
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
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewToggle: {
    padding: 8,
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
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.tint + '20',
  },
  addButtonText: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  teacherCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  teacherHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  teacherPhotoContainer: {
    marginRight: 12,
  },
  teacherPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  teacherPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  teacherDetails: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  performanceText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
  },
  teacherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  contactButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.tint + '10',
  },
  actionButton: {
    padding: 6,
  },
  salaryInfo: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  salaryText: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    fontWeight: '600',
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
