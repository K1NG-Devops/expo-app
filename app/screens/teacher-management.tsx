/**
 * Teacher Management Screen
 * 
 * Allows principals to view, add, and manage teaching staff
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  classes: string[];
  hireDate: string;
}

export default function TeacherManagement() {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  const mockTeachers: Teacher[] = [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@school.com',
      status: 'active',
      classes: ['Grade R-A', 'Grade R-B'],
      hireDate: '2023-01-15',
    },
    {
      id: '2',
      firstName: 'Michael',
      lastName: 'Davis',
      email: 'michael.davis@school.com',
      status: 'active',
      classes: ['Grade 1-A'],
      hireDate: '2022-08-20',
    },
  ];

  React.useEffect(() => {
    // In production, this would fetch from Supabase
    setTeachers(mockTeachers);
  }, []);

  const handleAddTeacher = () => {
    Alert.alert(
      'Add Teacher',
      'This feature will allow you to invite new teachers to join your school.',
      [{ text: 'OK' }]
    );
  };

  const handleTeacherPress = (teacher: Teacher) => {
    Alert.alert(
      `${teacher.firstName} ${teacher.lastName}`,
      `Email: ${teacher.email}\nStatus: ${teacher.status}\nClasses: ${teacher.classes.join(', ')}`,
      [{ text: 'OK' }]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#059669';
      case 'inactive': return '#6B7280';
      case 'pending': return '#EA580C';
      default: return '#6B7280';
    }
  };

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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Teacher Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddTeacher}
        >
          <Ionicons name="add" size={24} color={Colors.light.tint} />
        </TouchableOpacity>
      </View>

      {/* Teachers List */}
      <FlatList
        data={teachers}
        renderItem={renderTeacher}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => {}} />
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  addButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
  },
  teacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  teacherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  teacherEmail: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 2,
  },
  teacherClasses: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  teacherStatus: {
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
