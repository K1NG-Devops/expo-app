import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const preschoolId = searchParams.get('preschoolId');

  if (!preschoolId) {
    return NextResponse.json({ error: 'Missing preschoolId' }, { status: 400 });
  }

  // Get session from cookies
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });

  // Verify user is authenticated and is a principal
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch teachers
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, phone, preschool_id, organization_id, role')
      .or(`organization_id.eq.${preschoolId},preschool_id.eq.${preschoolId}`)
      .eq('role', 'teacher')
      .order('first_name', { ascending: true });

    // Normalize teacher shape
    const normalized = (teachers || []).map((t: any) => ({
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email,
      phone_number: t.phone,
      status: 'active',
    }));

    const teachersList = normalized;

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      return NextResponse.json({ error: teachersError.message }, { status: 400 });
    }

    if (!teachersList || teachersList.length === 0) {
      return NextResponse.json({ teachers: [] });
    }

    const teacherIds = teachersList.map((t: any) => t.id);

    // Fetch class counts
    const { data: classData } = await supabase
      .from('classes')
      .select('teacher_id')
      .eq('preschool_id', preschoolId)
      .in('teacher_id', teacherIds);

    const classCountMap = new Map<string, number>();
    classData?.forEach(c => {
      classCountMap.set(c.teacher_id, (classCountMap.get(c.teacher_id) || 0) + 1);
    });

    // Fetch student counts
    const { data: studentData } = await supabase
      .from('students')
      .select('id, class_id')
      .eq('preschool_id', preschoolId);

    // Get class to teacher mapping
    const { data: classTeacherMap } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('preschool_id', preschoolId)
      .in('teacher_id', teacherIds);

    const classToTeacher = new Map<string, string>();
    classTeacherMap?.forEach(c => {
      classToTeacher.set(c.id, c.teacher_id);
    });

    // Count students per teacher
    const studentCountMap = new Map<string, number>();
    studentData?.forEach(s => {
      const teacherId = classToTeacher.get(s.class_id);
      if (teacherId) {
        studentCountMap.set(teacherId, (studentCountMap.get(teacherId) || 0) + 1);
      }
    });

    // Combine data
    const teachersWithCounts = teachersList.map((t: any) => ({
      ...t,
      class_count: classCountMap.get(t.id) || 0,
      student_count: studentCountMap.get(t.id) || 0,
    }));

    return NextResponse.json({ teachers: teachersWithCounts });
  } catch (error: any) {
    console.error('Error in teachers API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
