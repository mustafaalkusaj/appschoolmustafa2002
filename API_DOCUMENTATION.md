# API Documentation - تطبيق إدارة المدارس

## نظرة عامة
تطبيق متكامل لإدارة المدارس مع دعم كامل للمستخدمين والاشتراكات والفروع والمحاسبة.

## المعلومات الأساسية

**الإصدار**: 1.0.0  
**العنوان الأساسي**: `https://school-iraq.com/api`  
**لغات المحتوى**: `application/json`  
**المصادقة**: Bearer Token (JWT)

---

## المصادقة

جميع الطلبات تتطلب رأس مصادقة:

```
Authorization: Bearer <your_jwt_token>
```

### الأدوار المدعومة:
- `super_admin` - صلاحيات كاملة
- `group_admin` - إدارة مجموعة من المدارس
- `branch_user` - مستخدم الفرع
- `restricted` - مستخدم محدود بموديول واحد

---

## Endpoints

### المدارس (Schools)

#### GET `/api/web/super-admin/schools`
استرجاع جميع المدارس

**معاملات الاستعلام**:
- `search` (string) - البحث في اسم المدرسة
- `status` (string) - تصفية حسب الحالة: `active`, `inactive`, `archived`
- `plan` (string) - تصفية حسب الخطة: `basic`, `premium`, `enterprise`

**مثال الطلب**:
```bash
curl -X GET "https://school-iraq.com/api/web/super-admin/schools" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**مثال الرد (200 OK)**:
```json
{
  "ok": true,
  "schools": [
    {
      "id": "school_123",
      "name": "مدرسة النور",
      "address": "شارع الرشيد",
      "phone": "07701234567",
      "owner_email": "admin@school.com",
      "city": "بغداد",
      "logo_url": "https://...",
      "primary_color": "#4f8cff",
      "secondary_color": "#79d7ff",
      "plan": "premium",
      "is_active": true,
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "subscriptions": [
    {
      "id": "sub_123",
      "school_id": "school_123",
      "plan": "premium",
      "status": "active",
      "start_date": "2026-01-15",
      "end_date": "2027-01-15",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ],
  "schemaCompat": {
    "schoolColors": true,
    "branchesIsMain": true
  }
}
```

---

#### POST `/api/web/super-admin/schools`
إنشاء مدرسة جديدة

**جسم الطلب**:
```json
{
  "name": "مدرسة جديدة",
  "address": "العنوان",
  "phone": "07701234567",
  "owner_email": "owner@school.com",
  "city": "بغداد",
  "logo_url": "https://...",
  "primary_color": "#4f8cff",
  "secondary_color": "#79d7ff",
  "plan": "basic|premium|enterprise"
}
```

**مثال الطلب**:
```bash
curl -X POST "https://school-iraq.com/api/web/super-admin/schools" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "مدرسة النور الجديدة",
    "city": "بغداد",
    "plan": "premium"
  }'
```

**رد النجاح (201 Created)**:
```json
{
  "ok": true,
  "school": {
    "id": "school_124",
    "name": "مدرسة النور الجديدة",
    "is_active": true,
    "plan": "premium",
    "created_at": "2026-04-20T08:00:00Z"
  },
  "subscription": {
    "id": "sub_124",
    "school_id": "school_124",
    "plan": "premium",
    "status": "active",
    "start_date": "2026-04-20",
    "end_date": "2027-04-20"
  }
}
```

---

#### PATCH `/api/web/super-admin/schools/{schoolId}`
تحديث بيانات المدرسة

**معاملات المسار**:
- `schoolId` (required) - معرف المدرسة

**جسم الطلب**:
```json
{
  "name": "الاسم الجديد",
  "address": "العنوان الجديد",
  "phone": "07709876543",
  "owner_email": "newemail@school.com",
  "city": "الرياض",
  "logo_url": "https://...",
  "primary_color": "#ff0000",
  "secondary_color": "#00ff00",
  "plan": "enterprise",
  "mode": "update"
}
```

**وضع التبديل (Toggle Mode)**:
```json
{
  "is_active": false,
  "mode": "toggle"
}
```

**مثال الطلب**:
```bash
curl -X PATCH "https://school-iraq.com/api/web/super-admin/schools/school_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "مدرسة النور - الفرع الرئيسي", "city": "بغداد"}'
```

**مثال التبديل**:
```bash
curl -X PATCH "https://school-iraq.com/api/web/super-admin/schools/school_123" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false, "mode": "toggle"}'
```

**رد النجاح (200 OK)**:
```json
{
  "ok": true,
  "school": {
    "id": "school_123",
    "name": "مدرسة النور - الفرع الرئيسي",
    "city": "بغداد",
    "is_active": true
  }
}
```

---

#### DELETE `/api/web/super-admin/schools/{schoolId}`
حذف المدرسة (ناعم أو دائم)

**معاملات المسار**:
- `schoolId` (required) - معرف المدرسة

**معاملات الاستعلام**:
- `hardDelete` (boolean) - `true` للحذف الدائم، `false` للحذف الناعم (الافتراضي)

**مثال الحذف الناعم (Soft Delete - الأرشفة)**:
```bash
curl -X DELETE "https://school-iraq.com/api/web/super-admin/schools/school_123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**مثال الحذف الدائم (Hard Delete)**:
```bash
curl -X DELETE "https://school-iraq.com/api/web/super-admin/schools/school_123?hardDelete=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**رد النجاح (200 OK)**:
```json
{
  "ok": true,
  "school": {
    "id": "school_123",
    "name": "مدرسة النور"
  }
}
```

---

## رموز الأخطاء

### 400 Bad Request
```json
{
  "error": {
    "message": "اسم المدرسة مطلوب."
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "تعذر التحقق من صلاحيات المستخدم."
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "message": "المدرسة المطلوبة غير موجودة."
  }
}
```

### 429 Too Many Requests
```json
{
  "error": {
    "message": "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً."
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "حدث خطأ في الخادم. يرجى المحاولة لاحقاً."
  }
}
```

---

## حدود الطلبات (Rate Limiting)

تم تطبيق حدود الطلبات لحماية الخادم:

| الفئة | الحد | الفترة |
|------|-----|--------|
| API Endpoint | 100 طلب | 60 ثانية |
| Super Admin | 500 طلب | 60 ثانية |
| Auth | 20 طلب | 60 ثانية |
| File Upload | 10 طلب | 300 ثانية |

إذا تم تجاوز الحد، ستتلقى رد HTTP 429.

---

## الأمثلة العملية

### مثال كامل: إنشاء مدرسة مع الاشتراك

```bash
# 1. إنشاء المدرسة
curl -X POST "https://school-iraq.com/api/web/super-admin/schools" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "مدرسة الرسالة",
    "address": "شارع السعادة",
    "phone": "07712345678",
    "owner_email": "admin@message-school.com",
    "city": "الموصل",
    "plan": "enterprise",
    "primary_color": "#1e40af",
    "secondary_color": "#3b82f6"
  }' | jq '.school.id' > school_id.txt

SCHOOL_ID=$(cat school_id.txt)
echo "تم إنشاء المدرسة: $SCHOOL_ID"

# 2. تحديث بيانات المدرسة
curl -X PATCH "https://school-iraq.com/api/web/super-admin/schools/$SCHOOL_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logo_url": "https://example.com/logo.png"
  }'

# 3. استرجاع بيانات المدرسة
curl -X GET "https://school-iraq.com/api/web/super-admin/schools" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq ".schools[] | select(.id == \"$SCHOOL_ID\")"
```

---

## نصائح وأفضليات

1. **استخدام Pagination**: للبيانات الكبيرة، استخدم `limit` و `offset`
2. **Caching**: استخدم HTTP caching headers لتقليل الطلبات
3. **Batch Operations**: للعمليات المتعددة، استخدم batch endpoints إن توفرت
4. **Error Handling**: تعامل مع جميع أكوار الأخطاء الممكنة
5. **Logging**: سجل جميع العمليات المهمة لأغراض التدقيق

---

## الإصدارات

### v1.0.0 (2026-04-20)
- ✅ إدارة المدارس الكاملة
- ✅ نظام الاشتراكات
- ✅ Soft Delete و Hard Delete
- ✅ Rate Limiting
- ✅ Comprehensive Logging
- ✅ RBAC (4 مستويات)
- ✅ دعم الفروع والمجموعات

---

## الدعم والمساعدة

للمزيد من المعلومات أو للإبلاغ عن مشاكل، يرجى التواصل مع فريق التطوير.

**البريد الإلكتروني**: support@school-iraq.com  
**الموقع**: https://school-iraq.com
