# Student-to-Class Assignment Guide
*Complete walkthrough for Principal users*

## 🎯 Scenario: New school term setup

### **STEP 1: Prepare Classes**

1. **Navigate**: Principal Dashboard → Click "Class & Teacher Management"

2. **Create Grade R Class**:
   - Click "+" button (top right)
   - Fill form:
     ```
     Class Name: "Grade R-A"
     Grade Level: "Grade R" 
     Capacity: 20
     Room Number: "101"
     Assign Teacher: "Ms. Sarah Johnson"
     ```
   - Click "Create"

3. **Create Toddlers Class**:
   - Click "+" button again
   - Fill form:
     ```
     Class Name: "Toddlers Blue"
     Grade Level: "Toddlers (18m - 2y)"
     Capacity: 12
     Room Number: "102" 
     Assign Teacher: "Ms. Emma Davis"
     ```
   - Click "Create"

**Result**: Two classes created with teachers assigned

---

### **STEP 2: Assign Students to Classes**

#### **For Grade R Student (Emma Williams, Age 4)**

1. **Navigate**: Principal Dashboard → Click "Total Students" metric card

2. **Find Student**: Search for "Emma Williams" or scroll through list

3. **Open Details**: Click on Emma's student card

4. **Current Status**: Shows "Not assigned to any class" with warning icon

5. **Assign Class**: 
   - Click "Assign Class" button
   - Modal opens showing available classes:
     ```
     Grade R-A - Ms. Sarah Johnson (5/20)  ✓ Good fit
     Toddlers Blue - Ms. Emma Davis (8/12)  ✗ Too young
     ```
   - Select "Grade R-A"
   - Click "Save"

6. **Confirmation**: "Student successfully assigned to class"

#### **For Toddler Student (Liam Brown, Age 2)**

1. **Find Student**: Click on Liam's student card

2. **Current Status**: Shows "Not assigned to any class"

3. **Assign Class**:
   - Click "Assign Class" button
   - Select "Toddlers Blue - Ms. Emma Davis (9/12)"
   - Click "Save"

---

### **STEP 3: Verify Assignments**

#### **Check Class Enrollment**

1. **Navigate**: Back to "Class & Teacher Management"

2. **Grade R-A Class Card** now shows:
   ```
   Grade R-A
   Grade R
   Room 101
   
   Enrollment: 6/20 ✓ (in green - healthy)
   Teacher: Ms. Sarah Johnson
   
   [View Students] [Edit]
   ```

3. **Toddlers Blue Class Card** shows:
   ```
   Toddlers Blue  
   Toddlers (18m - 2y)
   Room 102
   
   Enrollment: 10/12 ⚠️ (in orange - getting full)  
   Teacher: Ms. Emma Davis
   
   [View Students] [Edit]
   ```

#### **Check Student Details**

1. **Emma Williams Details** now shows:
   ```
   Class Information:
   📚 Grade R-A
   Teacher: Ms. Sarah Johnson
   [Assign Class] (to reassign)
   ```

2. **Teacher Workload**: Ms. Johnson's profile shows "6 students" instead of previous count

---

## 🚨 **Important Notes**

### **Age-Appropriate Assignments**
- The system shows age groups automatically
- **Toddlers**: 18m - 2y (shows age in months)
- **Preschool**: 3-5y (shows "3y 6m" format)
- **Primary**: 6+ years (shows years only)

### **Capacity Warnings**
- **Green**: Under 80% capacity
- **Orange**: 80-95% capacity  
- **Red**: At/over capacity

### **Teacher Workload Monitoring**
- **Green**: Under 20 students total
- **Orange**: 20-30 students
- **Red**: Over 30 students (needs attention)

### **Bulk Operations** (Coming Soon)
- Select multiple students
- Bulk assign to classes
- Import/export class lists

---

## 🔧 **Troubleshooting**

### **Can't See Student?**
- Check if student status is "active"
- Verify you're looking at correct school
- Use search function

### **Can't Assign to Class?**
- Check if class is active (toggle might be off)
- Verify class capacity isn't full
- Ensure student age matches grade level

### **Teacher Assignment Issues?**
- Verify teacher status is "active" 
- Check if teacher already has too many classes
- Confirm teacher belongs to your school

---

## 📊 **Data Flow Summary**

```
1. Principal creates CLASS (with optional TEACHER)
   ↓
2. Principal assigns STUDENT to CLASS  
   ↓
3. System automatically links:
   - Student → Class → Teacher
   - Updates enrollment counts
   - Calculates ratios
   - Triggers notifications (if configured)
```

This creates the complete educational hierarchy needed for effective school management!