
export function RequiredFieldsNotice() {
  return (
    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
        <span>📋</span> متطلبات الملف
      </h4>
      <div className="space-y-4 text-sm">
        <div>
          <span className="font-bold text-red-600 dark:text-red-400 block mb-1">
            الحقول الإجبارية (يجب ملؤها):
          </span>
          <ul className="mr-4 list-disc list-inside text-gray-700 dark:text-gray-300 space-y-0.5">
            <li>الاسم الكامل (3 أحرف على الأقل)</li>
            <li>الصف (يجب أن يكون موجوداً في النظام)</li>
          </ul>
        </div>
        <div>
          <span className="font-bold text-gray-600 dark:text-gray-400 block mb-1">
            الحقول الاختيارية (يمكن تركها فارغة):
          </span>
          <ul className="mr-4 list-disc list-inside text-gray-500 dark:text-gray-400 space-y-0.5">
            <li>الشعبة (إذا كان الصف يحتوي على شعب، يجب مطابقة الاسم)</li>
            <li>رقم الهاتف، تاريخ الميلاد، الجنس</li>
            <li>العنوان، اسم ولي الأمر، رقم هاتف ولي الأمر</li>
            <li>ملاحظات</li>
          </ul>
        </div>
        <div className="text-xs text-purple-600 dark:text-purple-400 italic">
          * النظام يكتشف أسماء الأعمدة تلقائياً بالعربية أو الإنجليزية
        </div>
      </div>
    </div>
  );
}
