import type {
  AuditAction,
  AuditEntity,
  AuthErrorCode,
  Language,
  NotificationCode,
  Permission,
  PermissionGroup,
  Role,
  SchoolStatus,
  SubscriptionPlan,
  SystemNotification,
  UserStatus,
} from "@/lib/types";

export const DEFAULT_LANGUAGE: Language = "ar";
export const LANGUAGE_STORAGE_KEY = "school-saas-language";

const translations = {
  ar: {
    metadata: {
      title: "منصة إدارة المدارس",
      description: "لوحة تحكم متعددة المدارس مع الصلاحيات والاشتراكات وإدارة المستخدمين.",
    },
    common: {
      appName: "منصة إدارة المدارس",
      language: "اللغة",
      arabic: "العربية",
      english: "English",
      logout: "تسجيل الخروج",
      backToDashboard: "العودة إلى اللوحة",
      backToLogin: "العودة إلى تسجيل الدخول",
      cancel: "إلغاء",
      save: "حفظ",
      read: "تمت القراءة",
      noSchool: "بدون مدرسة",
      globalScope: "عام",
      active: "نشط",
      suspended: "معلّق",
      blocked: "محظور",
      archived: "مؤرشف",
      expired: "منتهي",
      activate: "تفعيل",
      suspend: "تعليق",
      archive: "أرشفة",
      restore: "استعادة",
      create: "إنشاء",
      update: "تحديث",
      view: "عرض",
      add: "إضافة",
      edit: "تعديل",
      delete: "حذف",
      manage: "إدارة",
      school: "المدرسة",
      status: "الحالة",
      students: "الطلاب",
      actions: "الإجراءات",
      permissions: "الصلاحيات",
      key: "المفتاح",
      description: "الوصف",
      name: "الاسم",
      email: "البريد الإلكتروني",
      role: "الدور",
      actor: "المنفذ",
      action: "الإجراء",
      entity: "الكيان",
      date: "التاريخ",
      subscription: "الاشتراك",
      plan: "الخطة",
      expires: "ينتهي في",
      daysRemaining: "{days} يوم متبقٍ",
      yes: "نعم",
      no: "لا",
    },
    languageToggle: {
      label: "عربي / English",
      switchToArabic: "التحويل إلى العربية",
      switchToEnglish: "Switch to English",
    },
    theme: {
      label: "المظهر",
      light: "الوضع الفاتح",
      dark: "الوضع الداكن",
    },
    roles: {
      super_admin: "المشرف العام",
      admin: "المدير",
      employee: "الموظف",
      teacher: "المعلّم",
    },
    entities: {
      school: "مدرسة",
      student: "طالب",
      payment: "دفعة",
      user: "مستخدم",
      subscription: "اشتراك",
      system: "النظام",
    },
    plans: {
      monthly: "شهري",
      yearly: "سنوي",
    },
    accessDenied: {
      title: "تم رفض الوصول",
      description: "لا تملك الصلاحيات الكافية لعرض هذا القسم.",
    },
    login: {
      title: "الدخول إلى منصة المدارس",
      subtitle: "اختر حسابًا تجريبيًا لاختبار الصلاحيات، التحكم بالوصول، وإدارة الاشتراكات.",
      schoolLabel: "المدرسة",
      subscriptionLabel: "الاشتراك",
      signIn: "تسجيل الدخول",
      signingIn: "جارٍ تسجيل الدخول...",
    },
    portal: {
      title: "لوحة المدرسة",
      subtitle: "مساحة عمل يومية تعتمد على الصلاحيات",
      loggedInAs: "تم تسجيل الدخول باسم",
      permissionsHint: "يتم إظهار الإجراءات وإخفاؤها تلقائيًا بناءً على صلاحيات المستخدم الحالية.",
      modules: {
        students: {
          title: "الطلاب",
          description: "إدارة بيانات الطلاب والتسجيل وتحديث الملفات.",
        },
        payments: {
          title: "المدفوعات",
          description: "متابعة الرسوم والإيصالات وسجل الحركات المالية.",
        },
        salaries: {
          title: "الرواتب",
          description: "عرض معلومات الرواتب وإدارة الاستحقاقات المالية.",
        },
      },
    },
    superAdmin: {
      title: "لوحة المشرف العام",
      subtitle: "تحكم مركزي بالمدارس والاشتراكات والمستخدمين وإعدادات المنصة",
      tabs: {
        overview: "نظرة عامة",
        schools: "المدارس",
        roles: "الأدوار",
        users: "المستخدمون",
        notifications: "الإشعارات",
        audit: "السجل",
        settings: "الإعدادات",
      },
      dataSource: {
        mock: "البيانات الحالية تعمل من المخزن المحلي الاحتياطي. عند ضبط Supabase سيتم استخدام الجداول الحقيقية تلقائيًا.",
        supabase: "البيانات متصلة مباشرة ببنية Supabase الإدارية.",
      },
      quickActions: {
        title: "إجراءات سريعة",
        addSchool: "إضافة مدرسة",
        addUser: "إضافة مستخدم",
        viewReport: "عرض التقرير",
        description: "وصول سريع إلى أكثر العمليات استخدامًا داخل المنصة.",
      },
      stats: {
        totalSchools: "إجمالي المدارس",
        totalUsers: "إجمالي المستخدمين",
        totalRevenue: "إجمالي الإيرادات",
        expiredSubscriptions: "الاشتراكات المنتهية",
        totalSchoolsHint: "كل المدارس المسجلة",
        totalUsersHint: "عبر جميع المدارس",
        totalRevenueHint: "إيراد شهري متكرر",
        expiredSubscriptionsHint: "تحتاج إلى تجديد فوري",
      },
      insights: {
        title: "مؤشرات ذكية للوحة التحكم",
      },
      charts: {
        schoolGrowthTrend: "اتجاه نمو المدارس",
        schoolGrowthTrendHint: "عدد المدارس الجديدة كل شهر",
        monthlyRevenue: "الإيراد الشهري",
        monthlyRevenueHint: "تطور الإيرادات خلال آخر 6 أشهر",
        topPayingSchools: "أعلى المدارس مساهمة",
        topPayingSchoolsHint: "أكبر المساهمين شهريًا",
      },
      schools: {
        title: "إدارة المدارس",
        school: "المدرسة",
        status: "الحالة",
        students: "الطلاب",
        expiry: "الانتهاء",
        action: "الإجراء",
        showArchived: "عرض المدارس المؤرشفة",
        archiveSchool: "أرشفة المدرسة",
        restoreSchool: "استعادة المدرسة",
      },
      subscriptions: {
        title: "الاشتراكات",
      },
      roles: {
        title: "إدارة الأدوار",
        createRole: "إنشاء دور",
        updateRole: "تحديث الدور",
        roleName: "اسم الدور",
        roleKey: "مفتاح الدور",
        description: "الوصف",
        usage: "المستخدمون",
        roleType: "النوع",
        roleStatus: "الحالة",
        showArchived: "عرض الأدوار المؤرشفة",
        archiveRole: "أرشفة الدور",
        restoreRole: "استعادة الدور",
        systemRole: "نظامي",
        customRole: "مخصص",
      },
      users: {
        title: "المستخدمون والصلاحيات",
        permissionsMatrix: "مصفوفة الصلاحيات",
        resetRoleTemplate: "إعادة تعيين قالب الدور",
        createUser: "إنشاء مستخدم",
        updateUser: "تحديث المستخدم",
        user: "المستخدم",
        school: "المدرسة",
        status: "الحالة",
        permissions: "الصلاحيات",
        actions: "الإجراءات",
        editUser: "تعديل المستخدم",
        resetUserPermissions: "إعادة ضبط الصلاحيات",
        toggleUserStatus: "تبديل حالة المستخدم",
        deleteUser: "حذف المستخدم",
        archiveUser: "أرشفة المستخدم",
        restoreUser: "استعادة المستخدم",
        showArchived: "عرض المستخدمين المؤرشفين",
      },
      notifications: {
        title: "مركز الإشعارات",
      },
      audit: {
        title: "سجل العمليات",
      },
      settings: {
        title: "إعدادات النظام",
        systemName: "اسم النظام",
        logoUrl: "رابط الشعار",
        timezone: "المنطقة الزمنية",
        currency: "العملة",
        allowSelfRegistration: "السماح بالتسجيل الذاتي",
        saveSettings: "حفظ الإعدادات",
      },
    },
    pages: {
      forbidden: {
        title: "403 - غير مصرح",
        description: "لا تملك صلاحية فتح هذه الصفحة.",
      },
      subscriptionExpired: {
        title: "الاشتراك منتهي",
        description: "تم تعليق وصول المدرسة لأن الاشتراك منتهي أو لأن المدرسة غير مفعلة.",
      },
    },
    permissionsCatalog: {
      groups: {
        students: "الطلاب",
        payments: "المدفوعات",
        salaries: "الرواتب",
        schools: "المدارس",
        subscriptions: "الاشتراكات",
        system: "النظام",
      },
      items: {
        view_students: {
          label: "عرض الطلاب",
          description: "يمكنه مشاهدة قوائم الطلاب وملفاتهم.",
        },
        add_students: {
          label: "إضافة الطلاب",
          description: "يمكنه إنشاء سجلات طلاب جديدة.",
        },
        edit_students: {
          label: "تعديل الطلاب",
          description: "يمكنه تحديث بيانات الطلاب.",
        },
        delete_students: {
          label: "حذف الطلاب",
          description: "يمكنه إزالة سجلات الطلاب.",
        },
        view_payments: {
          label: "عرض المدفوعات",
          description: "يمكنه مشاهدة جميع سجلات المدفوعات.",
        },
        add_payments: {
          label: "إضافة المدفوعات",
          description: "يمكنه تسجيل دفعات جديدة.",
        },
        delete_payments: {
          label: "حذف المدفوعات",
          description: "يمكنه حذف سجلات المدفوعات.",
        },
        view_salaries: {
          label: "عرض الرواتب",
          description: "يمكنه الاطلاع على تقارير الرواتب.",
        },
        manage_salaries: {
          label: "إدارة الرواتب",
          description: "يمكنه إنشاء وصرف وتحديث الرواتب.",
        },
        manage_schools: {
          label: "إدارة المدارس",
          description: "يمكنه تفعيل المدارس وتعديل ملفاتها.",
        },
        manage_subscriptions: {
          label: "إدارة الاشتراكات",
          description: "يمكنه تحديث الخطط وفترات الاشتراك.",
        },
        full_access: {
          label: "وصول كامل",
          description: "يتجاوز جميع فحوصات الصلاحيات.",
        },
      },
    },
    authErrors: {
      missing_user_id: "معرّف المستخدم مطلوب.",
      user_not_found: "تعذر العثور على المستخدم.",
      user_blocked: "هذا المستخدم محظور حاليًا.",
      subscription_inactive: "اشتراك هذه المدرسة منتهي أو المدرسة معلقة. سيتم رفض الوصول حتى التجديد أو إعادة التفعيل.",
      invalid_request: "الطلب غير صالح.",
      login_failed: "فشلت عملية تسجيل الدخول.",
    },
    auditActions: {
      created_school: "أنشأ مدرسة",
      updated_school: "حدّث مدرسة",
      archived_school: "أرشف مدرسة",
      restored_school: "استعاد مدرسة",
      deleted_student: "حذف طالبًا",
      recorded_payment: "سجّل دفعة",
      changed_system_settings: "غيّر إعدادات النظام",
      activated_school: "فعّل مدرسة",
      suspended_school: "علّق مدرسة",
      created_role: "أنشأ دورًا",
      updated_role: "حدّث دورًا",
      archived_role: "أرشف دورًا",
      restored_role: "استعاد دورًا",
      created_user: "أنشأ مستخدمًا",
      updated_user: "حدّث مستخدمًا",
      deleted_user: "حذف مستخدمًا",
      archived_user: "أرشف مستخدمًا",
      restored_user: "استعاد مستخدمًا",
      blocked_user: "حظر مستخدمًا",
      unblocked_user: "أزال حظر مستخدم",
      updated_system_settings: "حدّث إعدادات النظام",
    },
    notifications: {
      subscription_expired: {
        title: "انتهى الاشتراك",
        message: "انتهى اشتراك {schoolName} وتم تعليق الوصول.",
      },
      subscription_ending_soon: {
        title: "الاشتراك على وشك الانتهاء",
        message: "ينتهي اشتراك {schoolName} بعد {days}.",
      },
      user_onboarded: {
        title: "تمت إضافة مستخدم جديد",
        message: "تم إنشاء حساب {role} جديد لصالح {schoolName}.",
      },
      system_warning: {
        title: "تنبيه نظام",
        message: "فشل تصدير الفواتير في الخلفية مرة واحدة ثم تعافى تلقائيًا.",
      },
      activation_blocked: {
        title: "تم منع التفعيل",
        message: "لا يمكن تفعيل {schoolName} لأن الاشتراك منتهي.",
      },
      school_created: {
        title: "تم إنشاء مدرسة",
        message: "تمت إضافة {schoolName} مع خطة شهرية.",
      },
      user_created: {
        title: "تم إنشاء مستخدم",
        message: "تمت إضافة {userName} بدور {role}.",
      },
    },
    notices: {
      schoolCreated: "تم إنشاء مدرسة جديدة باشتراك شهري فعّال.",
      reportSummary: "التقرير: {schools} مدارس، {users} مستخدمين، وإيرادات بقيمة {revenue}.",
    },
    insights: {
      expiringTitle: "لدى {count} مدارس اشتراكات تنتهي خلال 7 أيام",
      noRenewalRisk: "لا توجد مخاطر تجديد فورية.",
      followUp: "{schools} تحتاج إلى متابعة فورية.",
      revenueUp: "ارتفعت إيرادات هذا الشهر بنسبة {percent}%",
      revenueDown: "انخفضت إيرادات هذا الشهر بنسبة {percent}%",
      currentRevenue: "إيرادات الشهر الحالي تبلغ {revenue} عبر المدارس النشطة.",
    },
  },
  en: {
    metadata: {
      title: "School Management Platform",
      description: "Multi-school dashboard with permissions, subscriptions, and user management.",
    },
    common: {
      appName: "School Management Platform",
      language: "Language",
      arabic: "Arabic",
      english: "English",
      logout: "Logout",
      backToDashboard: "Back to dashboard",
      backToLogin: "Back to login",
      cancel: "Cancel",
      save: "Save",
      read: "Read",
      noSchool: "No school",
      globalScope: "Global",
      active: "Active",
      suspended: "Suspended",
      blocked: "Blocked",
      archived: "Archived",
      expired: "Expired",
      activate: "Activate",
      suspend: "Suspend",
      archive: "Archive",
      restore: "Restore",
      create: "Create",
      update: "Update",
      view: "View",
      add: "Add",
      edit: "Edit",
      delete: "Delete",
      manage: "Manage",
      school: "School",
      status: "Status",
      students: "Students",
      actions: "Actions",
      permissions: "Permissions",
      key: "Key",
      description: "Description",
      name: "Name",
      email: "Email",
      role: "Role",
      actor: "Actor",
      action: "Action",
      entity: "Entity",
      date: "Date",
      subscription: "Subscription",
      plan: "Plan",
      expires: "Expires",
      daysRemaining: "{days} day(s) left",
      yes: "Yes",
      no: "No",
    },
    languageToggle: {
      label: "Arabic / English",
      switchToArabic: "Switch to Arabic",
      switchToEnglish: "Switch to English",
    },
    theme: {
      label: "Theme",
      light: "Light mode",
      dark: "Dark mode",
    },
    roles: {
      super_admin: "Super Admin",
      admin: "Admin",
      employee: "Employee",
      teacher: "Teacher",
    },
    entities: {
      school: "School",
      student: "Student",
      payment: "Payment",
      user: "User",
      subscription: "Subscription",
      system: "System",
    },
    plans: {
      monthly: "Monthly",
      yearly: "Yearly",
    },
    accessDenied: {
      title: "Access denied",
      description: "You do not have enough permissions to view this section.",
    },
    login: {
      title: "School platform access",
      subtitle: "Select a demo account to test permissions, access control, and subscription flows.",
      schoolLabel: "School",
      subscriptionLabel: "Subscription",
      signIn: "Login",
      signingIn: "Signing in...",
    },
    portal: {
      title: "School dashboard",
      subtitle: "Permission-aware workspace for daily operations",
      loggedInAs: "Logged in as",
      permissionsHint: "Actions are shown or hidden automatically based on the current user permissions.",
      modules: {
        students: {
          title: "Students",
          description: "Manage student data, registration, and profile updates.",
        },
        payments: {
          title: "Payments",
          description: "Track tuition payments, receipts, and transaction history.",
        },
        salaries: {
          title: "Salaries",
          description: "View salary information and manage payroll operations.",
        },
      },
    },
    superAdmin: {
      title: "Super admin dashboard",
      subtitle: "Global control for schools, subscriptions, users, and platform settings",
      tabs: {
        overview: "Overview",
        schools: "Schools",
        roles: "Roles",
        users: "Users",
        notifications: "Notifications",
        audit: "Audit",
        settings: "Settings",
      },
      dataSource: {
        mock: "The admin UI is currently running from the local fallback store. Once Supabase is configured it will use the real tables automatically.",
        supabase: "The admin UI is connected directly to the Supabase admin infrastructure.",
      },
      quickActions: {
        title: "Quick actions",
        addSchool: "Add school",
        addUser: "Add user",
        viewReport: "View report",
        description: "Fast access to the most common operations in the platform.",
      },
      stats: {
        totalSchools: "Total schools",
        totalUsers: "Total users",
        totalRevenue: "Total revenue",
        expiredSubscriptions: "Expired subscriptions",
        totalSchoolsHint: "All registered schools",
        totalUsersHint: "Across all schools",
        totalRevenueHint: "Monthly recurring revenue",
        expiredSubscriptionsHint: "Need immediate renewal",
      },
      insights: {
        title: "Smart dashboard insights",
      },
      charts: {
        schoolGrowthTrend: "School growth trend",
        schoolGrowthTrendHint: "New schools added monthly",
        monthlyRevenue: "Monthly revenue",
        monthlyRevenueHint: "Revenue evolution over the last 6 months",
        topPayingSchools: "Top paying schools",
        topPayingSchoolsHint: "Highest monthly contributors",
      },
      schools: {
        title: "Schools management",
        school: "School",
        status: "Status",
        students: "Students",
        expiry: "Expiry",
        action: "Action",
        showArchived: "Show archived schools",
        archiveSchool: "Archive school",
        restoreSchool: "Restore school",
      },
      subscriptions: {
        title: "Subscriptions",
      },
      roles: {
        title: "Roles management",
        createRole: "Create role",
        updateRole: "Update role",
        roleName: "Role name",
        roleKey: "Role key",
        description: "Description",
        usage: "Users",
        roleType: "Type",
        roleStatus: "Status",
        showArchived: "Show archived roles",
        archiveRole: "Archive role",
        restoreRole: "Restore role",
        systemRole: "System",
        customRole: "Custom",
      },
      users: {
        title: "Users & permissions",
        permissionsMatrix: "Permissions matrix",
        resetRoleTemplate: "Reset role template",
        createUser: "Create user",
        updateUser: "Update user",
        user: "User",
        school: "School",
        status: "Status",
        permissions: "Permissions",
        actions: "Actions",
        editUser: "Edit user",
        resetUserPermissions: "Reset permissions",
        toggleUserStatus: "Toggle user status",
        deleteUser: "Delete user",
        archiveUser: "Archive user",
        restoreUser: "Restore user",
        showArchived: "Show archived users",
      },
      notifications: {
        title: "Notification center",
      },
      audit: {
        title: "Audit log",
      },
      settings: {
        title: "System settings",
        systemName: "System name",
        logoUrl: "Logo URL",
        timezone: "Timezone",
        currency: "Currency",
        allowSelfRegistration: "Allow self registration",
        saveSettings: "Save settings",
      },
    },
    pages: {
      forbidden: {
        title: "403 - Forbidden",
        description: "You do not have permission to open this page.",
      },
      subscriptionExpired: {
        title: "Subscription expired",
        description: "Your school access is suspended because the subscription expired or the school was deactivated.",
      },
    },
    permissionsCatalog: {
      groups: {
        students: "Students",
        payments: "Payments",
        salaries: "Salaries",
        schools: "Schools",
        subscriptions: "Subscriptions",
        system: "System",
      },
      items: {
        view_students: {
          label: "View students",
          description: "Can see student lists and profiles.",
        },
        add_students: {
          label: "Add students",
          description: "Can create new student records.",
        },
        edit_students: {
          label: "Edit students",
          description: "Can update student data.",
        },
        delete_students: {
          label: "Delete students",
          description: "Can remove student records.",
        },
        view_payments: {
          label: "View payments",
          description: "Can see all payment records.",
        },
        add_payments: {
          label: "Add payments",
          description: "Can register new payments.",
        },
        delete_payments: {
          label: "Delete payments",
          description: "Can delete payment records.",
        },
        view_salaries: {
          label: "View salaries",
          description: "Can read salary reports.",
        },
        manage_salaries: {
          label: "Manage salaries",
          description: "Can create and update payroll payouts.",
        },
        manage_schools: {
          label: "Manage schools",
          description: "Can manage school activation and profiles.",
        },
        manage_subscriptions: {
          label: "Manage subscriptions",
          description: "Can update plans and subscription periods.",
        },
        full_access: {
          label: "Full access",
          description: "Bypasses all permission checks.",
        },
      },
    },
    authErrors: {
      missing_user_id: "User ID is required.",
      user_not_found: "User not found.",
      user_blocked: "This user is currently blocked.",
      subscription_inactive: "This school subscription is expired or suspended. Access is denied until renewal or reactivation.",
      invalid_request: "Invalid request.",
      login_failed: "Login failed.",
    },
    auditActions: {
      created_school: "Created school",
      updated_school: "Updated school",
      archived_school: "Archived school",
      restored_school: "Restored school",
      deleted_student: "Deleted student",
      recorded_payment: "Recorded payment",
      changed_system_settings: "Changed system settings",
      activated_school: "Activated school",
      suspended_school: "Suspended school",
      created_role: "Created role",
      updated_role: "Updated role",
      archived_role: "Archived role",
      restored_role: "Restored role",
      created_user: "Created user",
      updated_user: "Updated user",
      deleted_user: "Deleted user",
      archived_user: "Archived user",
      restored_user: "Restored user",
      blocked_user: "Blocked user",
      unblocked_user: "Unblocked user",
      updated_system_settings: "Updated system settings",
    },
    notifications: {
      subscription_expired: {
        title: "Subscription expired",
        message: "{schoolName} subscription expired and access was suspended.",
      },
      subscription_ending_soon: {
        title: "Subscription ending soon",
        message: "{schoolName} subscription ends in {days}.",
      },
      user_onboarded: {
        title: "New user onboarded",
        message: "A new {role} account was created for {schoolName}.",
      },
      system_warning: {
        title: "System warning",
        message: "Background invoice export failed once and recovered automatically.",
      },
      activation_blocked: {
        title: "Activation blocked",
        message: "{schoolName} cannot be activated because the subscription is expired.",
      },
      school_created: {
        title: "School created",
        message: "{schoolName} was added with a monthly plan.",
      },
      user_created: {
        title: "User created",
        message: "{userName} was added as {role}.",
      },
    },
    notices: {
      schoolCreated: "New school created with an active monthly subscription.",
      reportSummary: "Report: {schools} schools, {users} users, and {revenue} in revenue.",
    },
    insights: {
      expiringTitle: "{count} schools have subscriptions ending within 7 days",
      noRenewalRisk: "No immediate renewal risk found.",
      followUp: "{schools} need immediate follow-up.",
      revenueUp: "Revenue this month increased by {percent}%",
      revenueDown: "Revenue this month decreased by {percent}%",
      currentRevenue: "Current month revenue is {revenue} across active schools.",
    },
  },
} as const;

export type TranslationDictionary = (typeof translations)[Language];

export function getTranslations(language: Language = DEFAULT_LANGUAGE): TranslationDictionary {
  return translations[language];
}

export function getDirection(language: Language): "rtl" | "ltr" {
  return language === "ar" ? "rtl" : "ltr";
}

export function getLocale(language: Language): string {
  return language === "ar" ? "ar-IQ" : "en-US";
}

export function interpolate(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function formatNumber(value: number, language: Language): string {
  return new Intl.NumberFormat(getLocale(language)).format(value);
}

export function formatCurrency(value: number, language: Language, currencyCode = "USD"): string {
  return new Intl.NumberFormat(getLocale(language), {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDaysRemaining(days: number, language: Language): string {
  if (days < 0) {
    return getTranslations(language).common.expired;
  }

  return interpolate(getTranslations(language).common.daysRemaining, {
    days: formatNumber(days, language),
  });
}

export function getRoleLabel(role: Role, language: Language): string {
  const roles = getTranslations(language).roles;
  const value = roles[role as keyof typeof roles];
  if (value) {
    return value;
  }

  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getStatusLabel(status: UserStatus | SchoolStatus | "expired" | "archived", language: Language): string {
  const common = getTranslations(language).common;
  if (status === "active") {
    return common.active;
  }
  if (status === "suspended") {
    return common.suspended;
  }
  if (status === "blocked") {
    return common.blocked;
  }
  if (status === "archived") {
    return common.archived;
  }
  return common.expired;
}

export function getPlanLabel(plan: SubscriptionPlan, language: Language): string {
  return getTranslations(language).plans[plan];
}

export function getPermissionGroupLabel(group: PermissionGroup, language: Language): string {
  return getTranslations(language).permissionsCatalog.groups[group];
}

export function getPermissionContent(permission: Permission, language: Language) {
  return getTranslations(language).permissionsCatalog.items[permission];
}

export function getEntityLabel(entity: AuditEntity, language: Language): string {
  return getTranslations(language).entities[entity];
}

export function getAuditActionLabel(action: AuditAction, language: Language): string {
  return getTranslations(language).auditActions[action];
}

export function getAuthErrorMessage(code: AuthErrorCode | null | undefined, language: Language): string {
  const dictionary = getTranslations(language).authErrors;
  if (!code) {
    return dictionary.login_failed;
  }

  return dictionary[code];
}

function notificationValues(
  code: NotificationCode,
  data: Record<string, number | string | null> | undefined,
  language: Language,
): Record<string, string | number> {
  const schoolName = String(data?.schoolName ?? "");
  const userName = String(data?.userName ?? "");
  const role = data?.role ? getRoleLabel(String(data.role) as Role, language) : "";
  const days =
    typeof data?.days === "number" ? formatDaysRemaining(data.days, language) : String(data?.days ?? "");

  if (code === "subscription_ending_soon") {
    return { schoolName, days };
  }

  if (code === "user_onboarded" || code === "user_created") {
    return { schoolName, userName, role };
  }

  return { schoolName };
}

export function getNotificationContent(notification: SystemNotification, language: Language) {
  const entry = getTranslations(language).notifications[notification.code];
  const values = notificationValues(notification.code, notification.data, language);

  return {
    title: interpolate(entry.title, values),
    message: interpolate(entry.message, values),
  };
}

export function languageBootstrapScript() {
  return `
    (() => {
      const fallback = "${DEFAULT_LANGUAGE}";
      const storageKey = "${LANGUAGE_STORAGE_KEY}";
      try {
        const saved = window.localStorage.getItem(storageKey);
        const language = saved === "ar" || saved === "en" ? saved : fallback;
        const root = document.documentElement;
        root.lang = language;
        root.dir = language === "ar" ? "rtl" : "ltr";
        root.dataset.language = language;
      } catch {
        const root = document.documentElement;
        root.lang = fallback;
        root.dir = "rtl";
        root.dataset.language = fallback;
      }
    })();
  `;
}
