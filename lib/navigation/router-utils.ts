import { router } from 'expo-router';

/**
 * Type-safe navigation utility for handling dynamic routes that may not be
 * statically typed in the Expo Router system.
 */
export const navigateTo = {
  // Marketing routes
  contact: () => router.push('/(marketing)/contact' as any),
  
  // Screen routes with dynamic parameters
  classStudents: (classId: string) => 
    router.push(`/(app)/screens/class-students?classId=${classId}` as any),
  
  editClass: (classId: string) => 
    router.push(`/(app)/screens/edit-class?classId=${classId}` as any),
  
  addTeacher: () => 
    router.push('/(app)/screens/add-teacher' as any),
  
  teacherClasses: (teacherId: string) => 
    router.push(`/(app)/screens/teacher-classes?teacherId=${teacherId}` as any),
  
  editTeacher: (teacherId: string) => 
    router.push(`/(app)/screens/edit-teacher?teacherId=${teacherId}` as any),
  
  // Petty cash routes
  pettyCashHistory: () => 
    router.push('/(app)/screens/petty-cash-history' as any),
  
  pettyCashReport: () => 
    router.push('/(app)/screens/petty-cash-report' as any),
  
  // Student routes  
  editStudent: (studentId: string) => 
    router.push(`/(app)/screens/edit-student?studentId=${studentId}` as any),
  
  studentFees: (studentId: string) => 
    router.push(`/(app)/screens/student-fees?studentId=${studentId}` as any),
  
  // Financial routes
  addTransaction: () => 
    router.push('/(app)/screens/add-transaction' as any),
  
  paymentReminders: () => 
    router.push('/(app)/screens/payment-reminders' as any),
  
  expenseCategories: () => 
    router.push('/(app)/screens/expense-categories' as any),
  
  exportData: () => 
    router.push('/(app)/screens/export-data' as any),
  
  exportAllData: () => 
    router.push('/(app)/screens/export-all-data' as any),
  
  scheduleReports: () => 
    router.push('/(app)/screens/schedule-reports' as any),
  
  reportTemplates: () => 
    router.push('/(app)/screens/report-templates' as any),
  
  // Analytics routes
  exportAnalytics: () => 
    router.push('/(app)/screens/export-analytics' as any),
  
  academicReports: () => 
    router.push('/(app)/screens/academic-reports' as any),
  
  approvalHistory: () => 
    router.push('/(app)/screens/approval-history' as any),
  
  // Dynamic report routes
  dynamicReport: (reportName: string) => {
    const slug = reportName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    router.push(`/(app)/screens/reports/${slug}` as any);
  },
  
  // AI and class management
  aiProgressAnalysis: () => 
    router.push('/(app)/screens/ai-progress-analysis' as any),
  
  classDetails: (classId: string, className: string) => 
    router.push(`/(app)/screens/class-details?classId=${classId}&className=${encodeURIComponent(className)}` as any),
  
  assignmentDetails: (assignmentId: string, title: string) => 
    router.push(`/(app)/screens/assignment-details?assignmentId=${assignmentId}&title=${encodeURIComponent(title)}` as any),
  
  createClass: () => 
    router.push('/(app)/screens/create-class' as any),
  
  createEvent: () => 
    router.push('/(app)/screens/create-event' as any),
  
  // Announcements
  announcementsHistory: () => 
    router.push('/(app)/screens/announcements-history' as any),
  
  // Help routes
  financialReportsHelp: () => 
    router.push('/(app)/help/financial-reports' as any),
};

/**
 * Fallback function for any route not covered above
 */
export const navigateToPath = (path: string) => {
  try {
    router.push(path as any);
  } catch (error) {
    console.warn(`Navigation failed for path: ${path}`, error);
  }
};