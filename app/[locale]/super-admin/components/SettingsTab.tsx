"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Globe, 
  Palette, 
  Building,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SectionCard, cx } from "./UI";
import { logAction } from "@/lib/audit";

interface Setting {
  key: string;
  value: any;
}

export function SettingsTab() {
  const [settings, setSettings] = useState<Record<string, any>>({
    system_name: "نظام إدارة المدارس",
    contact_email: "support@example.com",
    contact_phone: "",
    address: "",
    primary_color: "#4f8cff",
    secondary_color: "#79d7ff",
    default_theme: "system",
    default_language: "ar",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("key, value")
        .is("school_id", null);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const mapped = data.reduce((acc, curr) => ({
          ...acc,
          [curr.key]: curr.value
        }), {});
        setSettings(prev => ({ ...prev, ...mapped }));
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
      setError("فشل في تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const upserts = Object.entries(settings).map(([key, value]) => ({
        key,
        value,
        school_id: null,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("system_settings")
        .upsert(upserts, { onConflict: "school_id, key" });

      if (error) throw error;

      await logAction({
        action_type: "settings_change",
        entity_type: "setting",
        summary: "تعديل إعدادات النظام العامة",
        metadata: settings
      });

      setSuccess("تم حفظ الإعدادات بنجاح");
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("فشل في حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="sk h-48 w-full rounded-[32px]" />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="ui-surface rounded-2xl bg-[rgba(240,90,90,0.1)] p-4 text-[var(--danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="ui-surface rounded-2xl bg-[rgba(47,182,122,0.1)] p-4 text-[var(--success)]">
          {success}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="معلومات النظام"
          description="البيانات الأساسية للمنصة التي تظهر للمستخدمين."
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">اسم النظام</label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="text" 
                  className="ui-input pl-10" 
                  value={settings.system_name}
                  onChange={e => setSettings({...settings, system_name: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">البريد الإلكتروني للتواصل</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="email" 
                  className="ui-input pl-10" 
                  value={settings.contact_email}
                  onChange={e => setSettings({...settings, contact_email: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">رقم الهاتف</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="text" 
                  className="ui-input pl-10" 
                  value={settings.contact_phone}
                  onChange={e => setSettings({...settings, contact_phone: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">العنوان</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <input 
                  type="text" 
                  className="ui-input pl-10" 
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="الهوية البصرية (Branding)"
          description="تخصيص الألوان والمظهر العام للمنصة."
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-[var(--text-secondary)]">اللون الأساسي</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    value={settings.primary_color}
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="ui-input min-h-0 py-2 text-xs" 
                    value={settings.primary_color}
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-[var(--text-secondary)]">اللون الثانوي</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    className="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    value={settings.secondary_color}
                    onChange={e => setSettings({...settings, secondary_color: e.target.value})}
                  />
                  <input 
                    type="text" 
                    className="ui-input min-h-0 py-2 text-xs" 
                    value={settings.secondary_color}
                    onChange={e => setSettings({...settings, secondary_color: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">السمة الافتراضية</label>
              <select 
                className="ui-input"
                value={settings.default_theme}
                onChange={e => setSettings({...settings, default_theme: e.target.value})}
              >
                <option value="system">تلقائي (حسب النظام)</option>
                <option value="light">فاتح (Light)</option>
                <option value="dark">داكن (Dark)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)]">اللغة الافتراضية</label>
              <select 
                className="ui-input"
                value={settings.default_language}
                onChange={e => setSettings({...settings, default_language: e.target.value})}
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="ui-button ui-button--primary flex items-center gap-2 px-8"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ التغييرات
        </button>
      </div>
    </form>
  );
}
