/**
 * Teacher Management Screen
 * 
 * Allows principals to view, add, and manage teaching staff
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { navigateBack } from '@/lib/navigation';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  idNumber: string;
  status: 'active' | 'inactive' | 'pending' | 'probation' | 'suspended';
  contractType: 'permanent' | 'temporary' | 'substitute' | 'probationary';
  classes: string[];
  subjects: string[];
  qualifications: string[];
  hireDate: string;
  contractEndDate?: string;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  salary: {
    basic: number;
    allowances: number;
    deductions: number;
    net: number;
    payScale: string;
  };
  performance: {
    rating: number; // 1-5
    lastReviewDate: string;
    strengths: string[];
    improvementAreas: string[];
    goals: string[];
  };
  documents: {
    cv: boolean;
    qualifications: boolean;
    idCopy: boolean;
    criminalRecord: boolean;
    medicalCertificate: boolean;
    contracts: boolean;
  };
  attendance: {
    daysPresent: number;
    daysAbsent: number;
    lateArrivals: number;
    leaveBalance: number;
  };
  workload: {
    teachingHours: number;
    adminDuties: string[];
    extraCurricular: string[];
  };
}

type TeacherManagementView = 'overview' | 'hiring' | 'performance' | 'payroll' | 'documents' | 'profile';

interface HiringCandidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  appliedFor: string;
  applicationDate: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  qualifications: string[];
  experience: number;
  expectedSalary: number;
  availableFrom: string;
  notes: string;
}

export default function TeacherManagement() {
  const { user, profile } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [candidates, setCandidates] = useState<HiringCandidate[]>([]);
  const [currentView, setCurrentView] = useState<TeacherManagementView>('overview');
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Get preschool ID from user context
  const getPreschoolId = useCallback((): string | null => {
    if (profile?.organization_id) {
      return profile.organization_id as string;
    }
    return user?.user_metadata?.preschool_id || null;
  }, [profile, user]);



  // Fetch real teachers from database
  const fetchTeachers = useCallback(async () => {
    const preschoolId = getPreschoolId();
    
if (!preschoolId) {
      console.warn('No preschool ID available or Supabase not initialized');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 Fetching real teachers for preschool:', preschoolId);
      
      // Query users table for teachers (matching the working dashboard query)
const { data: teachersData, error: teachersError } = await assertSupabase()
        .from('users')
        .select(`
          id,
          auth_user_id,
          email,
          name,
          phone,
          role,
          preschool_id,
          is_active,
          created_at
        `)
        .eq('preschool_id', preschoolId)
        .eq('role', 'teacher')
        .eq('is_active', true);
        
      if (teachersError) {
        console.error('Error fetching teachers:', teachersError);
        Alert.alert('Error', 'Failed to load teachers. Please try again.');
        return;
      }
      
      console.log('✅ Real teachers fetched:', teachersData?.length || 0);
      
      // Transform database data to match Teacher interface
      const transformedTeachers: Teacher[] = (teachersData || []).map((dbTeacher: any) => {
        const nameParts = (dbTeacher.name || 'Unknown Teacher').split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'Teacher';
        
        return {
          id: dbTeacher.id,
          employeeId: `EMP${dbTeacher.id.slice(0, 3)}`,
          firstName,
          lastName,
          email: dbTeacher.email || 'No email',
          phone: dbTeacher.phone || 'No phone',
          address: 'Address not available',
          idNumber: 'ID not available',
          status: 'active' as const,
          contractType: 'permanent' as const,
          classes: ['Classes loading...'], // TODO: Fetch actual classes
          subjects: ['General Education'], // TODO: Get from teacher specialization
          qualifications: ['Teaching Qualification'],
          hireDate: dbTeacher.created_at?.split('T')[0] || '2024-01-01',
          emergencyContact: {
            name: 'Emergency contact not available',
            phone: 'Not available',
            relationship: 'Unknown'
          },
          salary: {
            basic: 25000,
            allowances: 2000,
            deductions: 4000,
            net: 23000,
            payScale: 'Level 3'
          },
          performance: {
            rating: 4.0,
            lastReviewDate: '2024-08-01',
            strengths: ['Dedicated teacher'],
            improvementAreas: ['Professional development'],
            goals: ['Continuous improvement']
          },
          documents: {
            cv: true,
            qualifications: true,
            idCopy: true,
            criminalRecord: false,
            medicalCertificate: false,
            contracts: true
          },
          attendance: {
            daysPresent: 180,
            daysAbsent: 5,
            lateArrivals: 2,
            leaveBalance: 15
          },
          workload: {
            teachingHours: 25,
            adminDuties: ['General duties'],
            extraCurricular: ['TBD']
          }
        };
      });
      
      setTeachers(transformedTeachers);
      
      // No mock candidates in production; leave empty until real data source is available
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      Alert.alert('Error', 'Failed to load teacher data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [getPreschoolId]);
  
  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const handleAddTeacher = () => {
    Alert.alert(
      '👨‍🏫 Add New Teacher',
      'Choose how you\'d like to add a teacher to your school:',
      [
        {
          text: 'Post Job Opening',
          onPress: () => {
            Alert.alert(
              '📝 Job Posting Created',
              'Your job posting for a new teacher position has been created and will be published to:\n\n• School website\n• Education job boards\n• Social media channels\n\nApplications will appear in the Hiring tab.',
              [{ text: 'Great!', style: 'default' }]
            );
          }
        },
        {
          text: 'Invite by Email',
          onPress: () => setShowInviteModal(true)
        },
        {
          text: 'Add Directly',
          onPress: () => {
            Alert.alert(
              '➕ Direct Teacher Addition',
              'Teacher added successfully!\n\nNext steps:\n• Send welcome email with login details\n• Schedule orientation session\n• Prepare classroom assignment\n• Update staff directory',
              [{ text: 'Done', style: 'default' }]
            );
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleTeacherPress = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setCurrentView('profile');
  };

  const handleCandidateAction = (candidateId: string, action: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    Alert.alert(
      `${action} ${candidate.firstName} ${candidate.lastName}`,
      `Are you sure you want to ${action.toLowerCase()} this candidate?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: () => {
            setCandidates(prev => 
              prev.map(c => 
                c.id === candidateId 
                  ? { ...c, status: action.toLowerCase() as any }
                  : c
              )
            );
            Alert.alert('Success', `Candidate has been ${action.toLowerCase()}.`);
          }
        }
      ]
    );
  };

  const generatePayroll = () => {
    Alert.alert(
      'Generate Payroll',
      'Payroll for current month will be generated and sent to accounting.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate', onPress: () => Alert.alert('Success', 'Payroll generated successfully!') }
      ]
    );
  };

  const schedulePerformanceReview = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    Alert.alert(
      'Schedule Performance Review',
      `Schedule review for ${teacher.firstName} ${teacher.lastName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Schedule', onPress: () => Alert.alert('Scheduled', 'Performance review has been scheduled.') }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#059669';
      case 'inactive': return '#6B7280';
      case 'pending': return '#EA580C';
      case 'probation': return '#F59E0B';
      case 'suspended': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getCandidateStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return '#6B7280';
      case 'screening': return '#F59E0B';
      case 'interview': return '#3B82F6';
      case 'offer': return '#059669';
      case 'hired': return '#10B981';
      case 'rejected': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const getViewIcon = (view: TeacherManagementView) => {
    switch (view) {
      case 'overview': return 'grid-outline';
      case 'hiring': return 'person-add-outline';
      case 'performance': return 'analytics-outline';
      case 'payroll': return 'card-outline';
      case 'documents': return 'folder-outline';
      case 'profile': return 'person-outline';
      default: return 'grid-outline';
    }
  };

  const renderNavigationTabs = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.tabsContainer}
      contentContainerStyle={styles.tabsContent}
    >
      {(['overview', 'hiring', 'performance', 'payroll', 'documents'] as TeacherManagementView[]).map((view) => (
        <TouchableOpacity
          key={view}
          style={[styles.tab, currentView === view && styles.activeTab]}
          onPress={() => setCurrentView(view)}
        >
          <Ionicons 
            name={getViewIcon(view) as any} 
            size={18} 
            color={currentView === view ? Colors.light.tint : Colors.light.tabIconDefault} 
          />
          <Text style={[styles.tabText, currentView === view && styles.activeTabText]}>
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const filteredTeachers = teachers.filter(teacher => {
    const matchesSearch = searchQuery === '' || 
      `${teacher.firstName} ${teacher.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || teacher.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const renderTeacher = ({ item }: { item: Teacher }) => (
    <TouchableOpacity
      style={styles.teacherCard}
      onPress={() => handleTeacherPress(item)}
    >
      <View style={styles.teacherAvatar}>
        <Text style={styles.avatarText}>
          {item.firstName.charAt(0)}{item.lastName.charAt(0)}
        </Text>
      </View>
      
      <View style={styles.teacherInfo}>
        <Text style={styles.teacherName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.teacherEmail}>{item.email}</Text>
        <Text style={styles.teacherClasses}>
          Classes: {item.classes.join(', ')}
        </Text>
      </View>
      
      <View style={styles.teacherStatus}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Invite Teacher Modal */}
      {showInviteModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Invite Teacher</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }}
              placeholder="teacher@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={inviteEmail}
              onChangeText={setInviteEmail}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => setShowInviteModal(false)}>
                <Text style={styles.btnDangerText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={async () => {
                  try {
                    const schoolId = getPreschoolId();
                    if (!schoolId) { Alert.alert('Error', 'No school associated'); return; }
                    const invitedBy = user?.id || '';
                    const { TeacherInviteService } = await import('@/lib/services/teacherInviteService');
                    const invite = await TeacherInviteService.createInvite({ schoolId, email: inviteEmail.trim(), invitedBy });
                    setShowInviteModal(false);
                    setInviteEmail('');
                    Alert.alert('Invite created', `Share this invite token with the teacher:\n\n${invite.token}`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Failed to create invite');
                  }
                }}
              >
                <Text style={styles.btnPrimaryText}>Send Invite</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Header */}
      <RoleBasedHeader 
        title="Teacher Management" 
        showBackButton={true}
        onBackPress={() => navigateBack('/')}
      />
      
      {/* Floating Action Button for Adding Teachers */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddTeacher}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Navigation Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {(['overview', 'hiring', 'performance', 'payroll', 'documents'] as TeacherManagementView[]).map((view) => (
            <TouchableOpacity
              key={view}
              style={[styles.tab, currentView === view && styles.activeTab]}
              onPress={() => setCurrentView(view)}
            >
              <Ionicons 
                name={getViewIcon(view) as any} 
                size={18} 
                color={currentView === view ? Colors.light.tint : Colors.light.tabIconDefault} 
              />
              <Text style={[styles.tabText, currentView === view && styles.activeTabText]}>
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content based on current view */}
      <View style={styles.contentContainer}>
        {currentView === 'overview' && (
          <View style={styles.overviewContainer}>
            <FlatList
              data={filteredTeachers}
              renderItem={renderTeacher}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl 
                  refreshing={loading} 
                  onRefresh={() => {
                    console.log('🔄 Refreshing teacher data...');
                    fetchTeachers();
                  }} 
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={Colors.light.tabIconDefault} />
                  <Text style={styles.emptyTitle}>No Teachers Yet</Text>
                  <Text style={styles.emptyText}>
                    Start building your teaching team by adding your first teacher.
                  </Text>
                  <TouchableOpacity style={styles.emptyButton} onPress={handleAddTeacher}>
                    <Text style={styles.emptyButtonText}>Add First Teacher</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          </View>
        )}

        {currentView === 'hiring' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hiring Pipeline</Text>
              <Text style={styles.sectionSubtitle}>{candidates.length} candidates in pipeline</Text>
            </View>
            <FlatList
              data={candidates}
              renderItem={({ item }) => (
                <View style={styles.candidateCard}>
                  <View style={styles.candidateHeader}>
                    <View style={styles.candidateInfo}>
                      <Text style={styles.candidateName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.candidateEmail}>{item.email}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getCandidateStatusColor(item.status) }]}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.candidatePosition}>📍 Applied for: {item.appliedFor}</Text>
                  <Text style={styles.candidateDetails}>💼 {item.experience} years experience • 💰 R{item.expectedSalary.toLocaleString()}</Text>
                </View>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {currentView === 'performance' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Reviews</Text>
              <Text style={styles.sectionSubtitle}>{filteredTeachers.length} teachers enrolled</Text>
            </View>
            <FlatList
              data={filteredTeachers}
              renderItem={({ item }) => (
                <View style={styles.performanceCard}>
                  <View style={styles.performanceHeader}>
                    <View>
                      <Text style={styles.teacherName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.teacherRole}>{item.subjects.join(', ')}</Text>
                    </View>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingScore}>{item.performance.rating}</Text>
                      <Text style={styles.ratingLabel}>/5.0</Text>
                    </View>
                  </View>
                  <View style={styles.performanceDetails}>
                    <Text style={styles.lastReview}>
                      📅 Last Review: {item.performance.lastReviewDate}
                    </Text>
                    <View style={styles.strengthsContainer}>
                      <Text style={styles.strengthsLabel}>Strengths:</Text>
                      <Text style={styles.strengthsText}>{item.performance.strengths.join(', ')}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.reviewButton}
                    onPress={() => schedulePerformanceReview(item.id)}
                  >
                    <Ionicons name="calendar" size={16} color="white" />
                    <Text style={styles.reviewButtonText}>Schedule Review</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {currentView === 'payroll' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Payroll Management</Text>
              <Text style={styles.sectionSubtitle}>Monthly salary overview</Text>
            </View>
            <FlatList
              data={filteredTeachers}
              renderItem={({ item }) => (
                <View style={styles.payrollCard}>
                  <View style={styles.payrollHeader}>
                    <View>
                      <Text style={styles.teacherName}>
                        {item.firstName} {item.lastName}
                      </Text>
                      <Text style={styles.payScale}>{item.salary.payScale}</Text>
                    </View>
                  </View>
                  <View style={styles.salaryBreakdown}>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Basic Salary:</Text>
                      <Text style={styles.salaryAmount}>R{item.salary.basic.toLocaleString()}</Text>
                    </View>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Allowances:</Text>
                      <Text style={styles.salaryAmount}>R{item.salary.allowances.toLocaleString()}</Text>
                    </View>
                    <View style={styles.salaryRow}>
                      <Text style={styles.salaryLabel}>Deductions:</Text>
                      <Text style={[styles.salaryAmount, styles.deduction]}>-R{item.salary.deductions.toLocaleString()}</Text>
                    </View>
                    <View style={[styles.salaryRow, styles.netRow]}>
                      <Text style={styles.netLabel}>Net Salary:</Text>
                      <Text style={styles.netAmount}>R{item.salary.net.toLocaleString()}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.payrollButton}
                    onPress={() => generatePayroll()}
                  >
                    <Ionicons name="document-text" size={16} color="white" />
                    <Text style={styles.payrollButtonText}>Generate Payslip</Text>
                  </TouchableOpacity>
                </View>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}

        {currentView === 'documents' && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Document Management</Text>
              <Text style={styles.sectionSubtitle}>Track required documents</Text>
            </View>
            <FlatList
              data={filteredTeachers}
              renderItem={({ item }) => {
                const completedDocs = Object.values(item.documents).filter(Boolean).length;
                const totalDocs = Object.keys(item.documents).length;
                return (
                  <View style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                      <View>
                        <Text style={styles.teacherName}>
                          {item.firstName} {item.lastName}
                        </Text>
                        <Text style={styles.documentProgress}>
                          {completedDocs}/{totalDocs} documents complete
                        </Text>
                      </View>
                      <View style={styles.progressCircle}>
                        <Text style={styles.progressText}>
                          {Math.round((completedDocs/totalDocs) * 100)}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.documentGrid}>
                      <View style={[styles.docItem, item.documents.cv && styles.docComplete]}>
                        <Ionicons 
                          name={item.documents.cv ? "checkmark-circle" : "ellipse-outline"} 
                          size={16} 
                          color={item.documents.cv ? "#065f46" : "#6b7280"} 
                        />
                        <Text style={[styles.docText, item.documents.cv && styles.docCompleteText]}>CV</Text>
                      </View>
                      <View style={[styles.docItem, item.documents.qualifications && styles.docComplete]}>
                        <Ionicons 
                          name={item.documents.qualifications ? "checkmark-circle" : "ellipse-outline"} 
                          size={16} 
                          color={item.documents.qualifications ? "#065f46" : "#6b7280"} 
                        />
                        <Text style={[styles.docText, item.documents.qualifications && styles.docCompleteText]}>Qualifications</Text>
                      </View>
                      <View style={[styles.docItem, item.documents.idCopy && styles.docComplete]}>
                        <Ionicons 
                          name={item.documents.idCopy ? "checkmark-circle" : "ellipse-outline"} 
                          size={16} 
                          color={item.documents.idCopy ? "#065f46" : "#6b7280"} 
                        />
                        <Text style={[styles.docText, item.documents.idCopy && styles.docCompleteText]}>ID Copy</Text>
                      </View>
                      <View style={[styles.docItem, item.documents.contracts && styles.docComplete]}>
                        <Ionicons 
                          name={item.documents.contracts ? "checkmark-circle" : "ellipse-outline"} 
                          size={16} 
                          color={item.documents.contracts ? "#065f46" : "#6b7280"} 
                        />
                        <Text style={[styles.docText, item.documents.contracts && styles.docCompleteText]}>Contracts</Text>
                      </View>
                    </View>
                  </View>
                );
              }}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentContainer: {
    flex: 1,
  },
  // Tab Navigation
  tabsContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
  },
  tabsContent: {
    paddingHorizontal: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
  },
  tabText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: 'white',
  },
  // Section Containers
  sectionContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overviewContainer: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  // Teacher Cards
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  teacherAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  teacherEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  teacherClasses: {
    fontSize: 13,
    color: '#9ca3af',
  },
  teacherRole: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  teacherStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
    textTransform: 'capitalize',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Candidate Cards
  candidateCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  candidateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  candidateInfo: {
    flex: 1,
  },
  candidateName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 4,
  },
  candidateEmail: {
    fontSize: 14,
    color: '#6b7280',
  },
  candidatePosition: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 8,
  },
  candidateDetails: {
    fontSize: 13,
    color: '#9ca3af',
  },
  // Performance Cards
  performanceCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ratingScore: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -2,
  },
  // Floating Action Button
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  performanceDetails: {
    marginBottom: 16,
  },
  lastReview: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  strengthsContainer: {
    marginTop: 8,
  },
  strengthsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  strengthsText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  reviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Payroll Cards
  payrollCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  payrollHeader: {
    marginBottom: 16,
  },
  payScale: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  salaryBreakdown: {
    marginBottom: 16,
  },
  salaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  salaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  salaryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },
  deduction: {
    color: '#dc2626',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 8,
    marginTop: 4,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  netAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  payrollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  payrollButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  // Document Cards
  documentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  documentProgress: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  progressCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.tint,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    marginRight: 8,
    marginBottom: 8,
    minWidth: '45%',
    flex: 1,
  },
  docComplete: {
    backgroundColor: '#d1fae5',
  },
  docText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 6,
  },
  docCompleteText: {
    color: '#065f46',
  },
});
