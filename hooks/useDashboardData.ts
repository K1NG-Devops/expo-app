/**
 * Dashboard Data Hooks
 * 
 * Custom hooks for fetching dashboard data for different user roles
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Helper functions for business logic
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

const calculateEstimatedRevenue = (studentCount: number): number => {
  // Only use as absolute fallback when no payment data exists
  // Average fee per student per month (in Rand) - conservative estimate
  const averageFeePerStudent = 1000; // Conservative estimate
  return studentCount * averageFeePerStudent;
};

const calculateAttendanceRate = async (schoolId: string): Promise<number> => {
  if (!supabase) return 0;
  
  try {
    // Get attendance records from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('present, student_id')
      .eq('school_id', schoolId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);
    
    if (attendanceData && attendanceData.length > 0) {
      const presentCount = attendanceData.filter(a => a.present).length;
      return Math.round((presentCount / attendanceData.length) * 1000) / 10;
    }
  } catch (error) {
    console.error('Failed to calculate attendance rate:', error);
  }
  
  // Return 0 if no data available
  return 0;
};

const getNextLessonTime = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0); // 9:00 AM tomorrow
  
  return tomorrow.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const formatDueDate = (dueDateString: string): string => {
  const dueDate = new Date(dueDateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  
  if (dueDate.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (dueDate.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow';
  } else {
    return dueDate.toLocaleDateString('en-ZA', {
      month: 'short',
      day: 'numeric'
    });
  }
};

const getAssignmentStatus = (dueDateString: string, status: string): 'pending' | 'graded' | 'overdue' => {
  if (status === 'graded' || status === 'completed') return 'graded';
  
  const dueDate = new Date(dueDateString);
  const now = new Date();
  
  if (dueDate < now) return 'overdue';
  return 'pending';
};

// Types for dashboard data
export interface PrincipalDashboardData {
  schoolId?: string;
  schoolName: string;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  attendanceRate: number;
  monthlyRevenue: number;
  pendingApplications: number;
  upcomingEvents: number;
  capacity?: number;
  enrollmentPercentage?: number;
  lastUpdated?: string;
  recentActivity: Array<{
    id: string;
    type: 'enrollment' | 'payment' | 'teacher' | 'event';
    message: string;
    time: string;
    userName?: string;
  }>;
}

export interface TeacherDashboardData {
  schoolName: string;
  totalStudents: number;
  totalClasses: number;
  upcomingLessons: number;
  pendingGrading: number;
  myClasses: Array<{
    id: string;
    name: string;
    studentCount: number;
    grade: string;
    room: string;
    nextLesson: string;
  }>;
  recentAssignments: Array<{
    id: string;
    title: string;
    dueDate: string;
    submitted: number;
    total: number;
    status: 'pending' | 'graded' | 'overdue';
  }>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    time: string;
    type: 'meeting' | 'activity' | 'assessment';
  }>;
}

// Helper function to create empty dashboard data
const createEmptyPrincipalData = (schoolName: string = 'No School Assigned'): PrincipalDashboardData => ({
  schoolName,
  totalStudents: 0,
  totalTeachers: 0,
  totalParents: 0,
  attendanceRate: 0,
  monthlyRevenue: 0,
  pendingApplications: 0,
  upcomingEvents: 0,
  recentActivity: []
});

const createEmptyTeacherData = (): TeacherDashboardData => ({
  schoolName: 'No School Assigned',
  totalStudents: 0,
  totalClasses: 0,
  upcomingLessons: 0,
  pendingGrading: 0,
  myClasses: [],
  recentAssignments: [],
  upcomingEvents: []
});

/**
 * Comprehensive Principal Dashboard Hook with Real Data Integration
 * Provides complete school management analytics and real-time updates
 */
export const usePrincipalDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<PrincipalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    const startTime = Date.now();
    console.log('🏫 Loading Principal Dashboard data...');
    
    try {
      setLoading(true);
      setError(null);
      setLastRefresh(new Date());

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!supabase) {
        console.error('❌ Supabase client not available');
        setError('Database connection not available');
        setData(createEmptyPrincipalData('Database Error'));
        return;
      }

      // Enhanced principal data fetch with comprehensive error handling
      const { data: principalData, error: principalError } = await supabase
        .from('preschools')
        .select(`
          id,
          name,
          address,
          phone,
          email,
          subscription_status,
          principal_id
        `)
        .eq('principal_id', user.id)
        .maybeSingle();

      if (principalError && principalError.code !== 'PGRST116') {
        console.error('❌ Principal school fetch error:', principalError);
        throw new Error(`Database error: ${principalError.message}`);
      }

      let dashboardData: PrincipalDashboardData;

      if (principalData) {
        const schoolId = principalData.id;
        const schoolName = principalData.name || 'Unknown School';
        console.log(`📚 Loading data for ${schoolName} (ID: ${schoolId})`);

        // Helper function to map database activity types to dashboard types
        const mapActivityType = (actionType: string): string => {
          const typeMap: { [key: string]: string } = {
            'student_created': 'enrollment',
            'student_enrolled': 'enrollment',
            'payment_completed': 'payment',
            'payment_received': 'payment',
            'teacher_hired': 'teacher',
            'teacher_updated': 'teacher',
            'event_created': 'event',
            'meeting_scheduled': 'event'
          };
          
          return typeMap[actionType] || 'event';
        };

        // Parallel data fetching with strict security filters
        const dataPromises = [
          // Students data - only for this principal's school
          supabase
            .from('students')
            .select('id, status, created_at, grade_level, preschool_id')
            .eq('preschool_id', schoolId)
            .not('id', 'is', null), // Ensure valid records

          // Teachers data - only for this principal's school
          supabase
            .from('teachers')
            .select('id, status, first_name, last_name, created_at, preschool_id')
            .eq('preschool_id', schoolId)
            .not('id', 'is', null),

          // Parents data - only from students in this principal's school
          supabase
            .from('students')
            .select(`
              id,
              parent_email,
              parent_phone,
              preschool_id
            `)
            .eq('preschool_id', schoolId)
            .not('parent_email', 'is', null)
            .not('id', 'is', null),

          // Payments - only for this principal's school with date bounds
          supabase
            .from('payments')
            .select('amount, created_at, status, payment_type, school_id')
            .eq('school_id', schoolId)
            .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 60)).toISOString()) // Last 60 days for broader context
            .not('id', 'is', null),

          // Applications - only for this principal's school
          supabase
            .from('student_applications')
            .select('id, applicant_name, created_at, status, grade_applied, school_id')
            .eq('school_id', schoolId)
            .in('status', ['pending', 'under_review', 'interview_scheduled'])
            .not('id', 'is', null),

          // Events - only for this principal's school with date bounds
          supabase
            .from('events')
            .select('id, title, event_date, event_type, description, school_id')
            .eq('school_id', schoolId)
            .gte('event_date', new Date().toISOString())
            .lte('event_date', new Date(new Date().setDate(new Date().getDate() + 30)).toISOString())
            .not('id', 'is', null),

          // Activity logs - only for this principal's organization with enhanced filtering
          supabase
            .from('audit_logs')
            .select('id, action_type, description, created_at, user_name, table_name, organization_id')
            .eq('organization_id', schoolId)
            .not('id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(10)
        ];

        const results = await Promise.allSettled(dataPromises);
        const [studentsResult, teachersResult, parentsResult, paymentsResult, applicationsResult, eventsResult, activitiesResult] = results;

        // Extract data with proper error handling
        const studentsData = studentsResult.status === 'fulfilled' ? studentsResult.value.data || [] : [];
        const teachersData = teachersResult.status === 'fulfilled' ? teachersResult.value.data || [] : [];
        const parentsData = parentsResult.status === 'fulfilled' ? parentsResult.value.data || [] : [];
        const paymentsData = paymentsResult.status === 'fulfilled' ? paymentsResult.value.data || [] : [];
        const applicationsData = applicationsResult.status === 'fulfilled' ? applicationsResult.value.data || [] : [];
        const eventsData = eventsResult.status === 'fulfilled' ? eventsResult.value.data || [] : [];
        const activitiesData = activitiesResult.status === 'fulfilled' ? activitiesResult.value.data || [] : [];

        // Log any failed requests for debugging
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const queries = ['students', 'teachers', 'parents', 'payments', 'applications', 'events', 'activities'];
            console.warn(`⚠️ ${queries[index]} query failed:`, result.reason);
          }
        });

        // Calculate comprehensive metrics with proper typing
        const activeStudents = studentsData.filter((s: any) => s?.status === 'active');
        const totalStudents = activeStudents.length;
        
        const activeTeachers = teachersData.filter((t: any) => t?.status === 'active');
        const totalTeachers = activeTeachers.length;
        
        // Calculate unique parents count with better validation
        const uniqueParentEmails = new Set<string>();
        parentsData.forEach((student: any) => {
          const email = student?.parent_email?.trim();
          if (email && email.includes('@') && email.length > 5) {
            uniqueParentEmails.add(email.toLowerCase());
          }
        });
        const totalParents = uniqueParentEmails.size;

        // Calculate real attendance rate with error handling
        let attendanceRate = 0;
        try {
          attendanceRate = await calculateAttendanceRate(schoolId);
        } catch (error) {
          console.warn('Failed to calculate attendance rate:', error);
          // Keep as 0 rather than throwing
        }

        // Calculate monthly revenue from real payments only
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const currentMonthPayments = paymentsData.filter((p: any) => {
          if (!p?.created_at || p?.status !== 'completed') return false;
          const paymentDate = new Date(p.created_at);
          return paymentDate >= monthStart && paymentDate <= monthEnd;
        });
        
        let monthlyRevenue = currentMonthPayments.reduce((sum: number, payment: any) => {
          // Ensure amount is treated as cents if needed, convert to Rand
          const amount = payment?.amount || 0;
          // Assume amounts in database are in cents, convert to Rand
          return sum + (amount > 1000 ? amount / 100 : amount);
        }, 0);
        
        // Only estimate if absolutely no payment records exist for the school
        if (monthlyRevenue === 0 && paymentsData.length === 0 && totalStudents > 0) {
          monthlyRevenue = calculateEstimatedRevenue(totalStudents);
        }

        // Process applications
        const pendingApplications = applicationsData.length;

        // Process upcoming events
        const upcomingEvents = eventsData.length;

        // Calculate capacity metrics (column may not exist); default to 0
        const capacity = (principalData as any)?.capacity ?? 0;
        const enrollmentPercentage = capacity > 0 ? Math.round((totalStudents / capacity) * 100) : 0;

        // Process recent activity with enhanced formatting
        let recentActivity = activitiesData.map((activity: any) => ({
          id: activity?.id || 'unknown',
          type: mapActivityType(activity?.action_type || 'event') as 'enrollment' | 'payment' | 'teacher' | 'event',
          message: activity?.description || `${activity?.action_type || 'Unknown'} activity`,
          time: formatTimeAgo(activity?.created_at || new Date().toISOString()),
          userName: activity?.user_name || 'System'
        }));

        // Add synthetic recent activity if none exists
        if (recentActivity.length === 0) {
          recentActivity = [
            {
              id: 'synthetic-students',
              type: 'enrollment',
              message: `${totalStudents} students currently enrolled`,
              time: 'Currently',
              userName: 'System'
            },
            {
              id: 'synthetic-teachers',
              type: 'teacher',
              message: `${totalTeachers} active teaching staff members`,
              time: 'Currently',
              userName: 'System'
            }
          ];
          
          if (pendingApplications > 0) {
            recentActivity.push({
              id: 'synthetic-applications',
              type: 'enrollment',
              message: `${pendingApplications} pending applications awaiting review`,
              time: 'Pending',
              userName: 'System'
            });
          }
        }

        dashboardData = {
          schoolId,
          schoolName,
          totalStudents,
          totalTeachers,
          totalParents,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          monthlyRevenue: Math.round(monthlyRevenue),
          pendingApplications,
          upcomingEvents,
          capacity,
          enrollmentPercentage,
          lastUpdated: new Date().toISOString(),
          recentActivity: recentActivity.slice(0, 8) // Limit to 8 most recent
        };

        const loadTime = Date.now() - startTime;
        console.log(`✅ Dashboard data loaded successfully in ${loadTime}ms:`, {
          school: schoolName,
          students: totalStudents,
          teachers: totalTeachers,
          parents: totalParents,
          revenue: monthlyRevenue,
          attendance: attendanceRate
        });

      } else {
        // No school found for this principal
        console.warn('⚠️ No school found for this principal');
        dashboardData = {
          ...createEmptyPrincipalData('No School Assigned'),
          schoolId: undefined,
          lastUpdated: new Date().toISOString(),
          recentActivity: [
            {
              id: 'no-school',
              type: 'event',
              message: 'No school assigned to this principal account',
              time: 'Now',
              userName: 'System'
            }
          ]
        };
      }

      setData(dashboardData);
    } catch (err) {
      console.error('❌ Failed to fetch principal dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      // Fallback to empty data with error indication
      setData({
        ...createEmptyPrincipalData('Database Error'),
        schoolId: 'error-fallback',
        lastUpdated: new Date().toISOString(),
        recentActivity: [
          {
            id: 'error-notice',
            type: 'event',
            message: `Dashboard error: ${errorMessage}`,
            time: 'Just now',
            userName: 'System'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    console.log('🔄 Refreshing Principal Dashboard data...');
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes when data is loaded
  useEffect(() => {
    if (!data || loading) return;

    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing Principal Dashboard');
      fetchData();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchData, data, loading]);

  return {
    data,
    loading,
    error,
    refresh,
    lastRefresh
  };
};

/**
 * Hook for fetching Teacher dashboard data
 */
export const useTeacherDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!supabase) {
        throw new Error('Supabase client not available');
      }

      // Fetch teacher data with school information
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select(`
          id,
          user_id,
          preschool_id,
          first_name,
          last_name,
          preschools!inner(
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (teacherError) {
        console.error('Teacher fetch error:', teacherError);
      }

      let dashboardData: TeacherDashboardData;

      if (teacherData) {
        const teacherId = teacherData.id;
        const schoolName = (teacherData.preschools as any)?.name || 'Unknown School';

        // Fetch teacher's classes
        const { data: classesData } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            grade_level,
            room_number,
            students!inner(id)
          `)
          .eq('teacher_id', teacherId);

        const myClasses = classesData?.map(classItem => ({
          id: classItem.id,
          name: classItem.name,
          studentCount: classItem.students?.length || 0,
          grade: classItem.grade_level || 'Grade R',
          room: classItem.room_number || 'TBD',
          nextLesson: getNextLessonTime()
        })) || [];

        // Calculate total students
        const totalStudents = myClasses.reduce((sum, cls) => sum + cls.studentCount, 0);

        // Fetch assignments
        const { data: assignmentsData } = await supabase
          .from('assignments')
          .select(`
            id,
            title,
            due_date,
            status,
            assignment_submissions!left(
              id,
              status
            )
          `)
          .eq('teacher_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(3);

        const recentAssignments = assignmentsData?.map(assignment => {
          const submissions = assignment.assignment_submissions || [];
          const submittedCount = submissions.filter(s => s.status === 'submitted').length;
          const totalCount = submissions.length;
          
          return {
            id: assignment.id,
            title: assignment.title,
            dueDate: formatDueDate(assignment.due_date),
            submitted: submittedCount,
            total: totalCount,
            status: getAssignmentStatus(assignment.due_date, assignment.status)
          };
        }) || [];

        // Calculate pending grading
        const pendingGrading = recentAssignments
          .filter(a => a.status === 'pending')
          .reduce((sum, a) => sum + a.submitted, 0);

        dashboardData = {
          schoolName,
          totalStudents,
          totalClasses: myClasses.length,
          upcomingLessons: Math.min(myClasses.length, 3),
          pendingGrading,
          myClasses,
          recentAssignments,
          upcomingEvents: []
        };
      } else {
        // No teacher record found, use empty data
        dashboardData = createEmptyTeacherData();
      }

      setData(dashboardData);
    } catch (err) {
      console.error('Failed to fetch teacher dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      // Fallback to empty data on error
      setData({
        ...createEmptyTeacherData(),
        recentActivity: [
          {
            id: 'error-notice',
            type: 'event', 
            message: `Teacher data error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            time: 'Just now'
          }
        ]
      } as any);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
};

/**
 * Hook for fetching common dashboard analytics
 */
export const useDashboardAnalytics = (role: 'principal' | 'teacher') => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<{
    aiUsage: { current: number; limit: number };
    subscriptionStatus: string;
    recentLogins: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);

      // Mock analytics data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAnalytics({
        aiUsage: { current: 15, limit: 100 },
        subscriptionStatus: 'active',
        recentLogins: 24
      });
    } catch (err) {
      console.error('Failed to fetch dashboard analytics:', err);
      // Set default analytics on error
      setAnalytics({
        aiUsage: { current: 0, limit: 100 },
        subscriptionStatus: 'unknown',
        recentLogins: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, refresh: fetchAnalytics };
};
