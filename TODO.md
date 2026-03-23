# Students Page TypeScript Fix Plan
✅ **1. Create types/student.ts** (Student interface + computed fees)
⏳ **2. Update app/[locale]/students/page.tsx** 
   - Type fetchPagedStudents return
   - Transform query to add remaining_fee  
   - Type all state variables (selectedStudent, editForm, etc.)
   - Fix statusMap Record typing
   - Type all functions using Student[]
⏳ **3. Verify npm run build** (no TS errors)
⏳ **4. Test /ar/students renders correctly**
⏳ **5. attempt_completion**
