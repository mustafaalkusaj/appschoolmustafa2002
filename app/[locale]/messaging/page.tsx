"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  MessageSquare,
  Send,
  RefreshCw,
  Loader2,
  ChevronRight,
  Plus,
  Search,
  X,
  User,
} from "@/lib/icons";

interface Recipient {
  id: string;
  name: string;
  role: string;
  class_name: string | null;
}

interface Conversation {
  id: string;
  school_id: string | null;
  title: string | null;
  display_name: string;
  created_at: string;
  last_message?: { body: string; created_at: string; sender_id: string | null } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString("ar-IQ-u-nu-latn", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessagingPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const myUserId = profile?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Recipient[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [newMsgBody, setNewMsgBody] = useState("");
  const [creatingConv, setCreatingConv] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInbox = useCallback(async () => {
    setLoadingInbox(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        items: Conversation[];
        error?: string;
      }>("/api/web/messaging");
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "تعذر تحميل المحادثات");
      setConversations(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  useEffect(() => {
    void fetchInbox();
  }, [fetchInbox]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setMessages([]);
    setLoadingThread(true);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        items: Message[];
        error?: string;
      }>(`/api/web/messaging?threadId=${encodeURIComponent(id)}`);
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "تعذر تحميل الرسائل");
      setMessages(payload.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  const searchRecipients = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        items: Recipient[];
      }>(`/api/web/messaging/recipients?q=${encodeURIComponent(q)}`);
      setSearchResults(payload?.items ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        void searchRecipients(value);
      }, 300);
    },
    [searchRecipients],
  );

  const startConversation = useCallback(async () => {
    if (!selectedRecipient || !newMsgBody.trim()) return;
    setCreatingConv(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        item: { id: string; conversation_id: string };
        error?: string;
      }>("/api/web/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [selectedRecipient.id],
          body: newMsgBody.trim(),
        }),
      });
      if (!response.ok || !payload?.ok)
        throw new Error(payload?.error ?? "تعذر إنشاء المحادثة");
      setShowNewDialog(false);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedRecipient(null);
      setNewMsgBody("");
      await fetchInbox();
      if (payload.item?.conversation_id) {
        void openThread(payload.item.conversation_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setCreatingConv(false);
    }
  }, [selectedRecipient, newMsgBody, fetchInbox, openThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!draft.trim() || !activeId) return;
    setSending(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        item: Message;
        error?: string;
      }>("/api/web/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: activeId, body: draft.trim() }),
      });
      if (!response.ok || !payload?.ok) throw new Error(payload?.error ?? "تعذر إرسال الرسالة");
      if (payload.item) setMessages((prev) => [...prev, payload.item]);
      setDraft("");
      void fetchInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setSending(false);
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/messaging" />
        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title="الرسائل"
            subtitle="صندوق الوارد والمحادثات"
            scope={schoolScope}
            fixed
          />
          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-hidden">
            <div className="p-4 sm:p-6 h-full">
              {error && (
                <div className="mb-4 rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)]">
                {/* Inbox */}
                <div
                  className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] flex flex-col overflow-hidden ${
                    activeId ? "hidden lg:flex" : "flex"
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                    <h3 className="font-black text-[var(--text-primary)]">
                      المحادثات
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowNewDialog(true);
                          setSearchQuery("");
                          setSearchResults([]);
                          setSelectedRecipient(null);
                          setNewMsgBody("");
                        }}
                        className="h-8 px-3 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition"
                        style={{ background: "var(--primary)" }}
                      >
                        <Plus size={14} />
                        جديدة
                      </button>
                      <button
                        onClick={() => void fetchInbox()}
                        className="w-8 h-8 rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] transition"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loadingInbox ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessageSquare size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
                        <p className="text-sm font-black text-[var(--text-secondary)]">لا توجد محادثات</p>
                      </div>
                    ) : (
                      conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => void openThread(c.id)}
                          className={`w-full text-start px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface-soft)] transition flex items-center gap-2 ${
                            activeId === c.id ? "bg-[var(--primary)]/5" : ""
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                            <MessageSquare size={16} className="text-[var(--primary)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-[var(--text-primary)] truncate">
                              {c.display_name}
                            </p>
                            {c.last_message && (
                              <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                                {c.last_message.body}
                              </p>
                            )}
                          </div>
                          <ChevronRight size={14} className="text-[var(--text-muted)] flex-shrink-0" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Thread */}
                <div
                  className={`rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] flex flex-col overflow-hidden ${
                    activeId ? "flex" : "hidden lg:flex"
                  }`}
                >
                  {!activeConversation ? (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare size={40} className="mx-auto mb-3 text-[var(--text-muted)]" />
                        <p className="font-black text-[var(--text-secondary)]">اختر محادثة لعرضها</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
                        <button
                          onClick={() => setActiveId(null)}
                          className="lg:hidden w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]"
                        >
                          <ChevronRight size={16} />
                        </button>
                        <p className="font-black text-[var(--text-primary)]">
                          {activeConversation.display_name}
                        </p>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {loadingThread ? (
                          <div className="flex items-center justify-center py-16">
                            <Loader2 size={24} className="animate-spin text-[var(--primary)]" />
                          </div>
                        ) : messages.length === 0 ? (
                          <p className="text-center text-sm font-bold text-[var(--text-muted)] py-8">
                            لا توجد رسائل بعد
                          </p>
                        ) : (
                          messages.map((m) => {
                            const mine = myUserId != null && m.sender_id === myUserId;
                            return (
                              <div
                                key={m.id}
                                className={`flex ${mine ? "justify-start" : "justify-end"}`}
                              >
                                <div
                                  className="max-w-[75%] rounded-2xl px-4 py-2.5"
                                  style={
                                    mine
                                      ? { background: "var(--primary)", color: "white" }
                                      : { background: "var(--surface-soft)", color: "var(--text-primary)" }
                                  }
                                >
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                                  <p
                                    className="text-[10px] font-bold mt-1 opacity-70"
                                    style={{ color: mine ? "white" : "var(--text-muted)" }}
                                  >
                                    {formatTime(m.created_at)}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={bottomRef} />
                      </div>

                      <div className="border-t border-[var(--border)] p-3 flex items-center gap-2">
                        <input
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSend();
                            }
                          }}
                          placeholder="اكتب رسالة..."
                          className="flex-1 h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] px-4 text-sm"
                        />
                        <button
                          onClick={() => void handleSend()}
                          disabled={sending || !draft.trim()}
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white disabled:opacity-50"
                          style={{ background: "var(--primary)" }}
                        >
                          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </main>

          {showNewDialog && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowNewDialog(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] shadow-2xl mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                  <h3 className="font-black text-[var(--text-primary)]">
                    محادثة جديدة
                  </h3>
                  <button
                    onClick={() => setShowNewDialog(false)}
                    className="w-8 h-8 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--danger)] transition"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  {!selectedRecipient ? (
                    <>
                      <div className="relative">
                        <Search
                          size={16}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                        />
                        <input
                          value={searchQuery}
                          onChange={(e) => handleSearchInput(e.target.value)}
                          placeholder="ابحث عن طالب بالاسم..."
                          autoFocus
                          className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] pr-10 pl-4 text-sm"
                        />
                      </div>

                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {searching ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2
                              size={20}
                              className="animate-spin text-[var(--primary)]"
                            />
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((r) => (
                            <button
                              key={r.id}
                              onClick={() => setSelectedRecipient(r)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--surface-soft)] transition text-start"
                            >
                              <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                                <User
                                  size={16}
                                  className="text-[var(--primary)]"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                                  {r.name}
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                  {r.role === "student"
                                    ? "طالب"
                                    : r.role === "teacher"
                                      ? "أستاذ"
                                      : r.role}
                                  {r.class_name ? ` · ${r.class_name}` : ""}
                                </p>
                              </div>
                            </button>
                          ))
                        ) : searchQuery.length >= 2 ? (
                          <p className="text-center text-sm text-[var(--text-muted)] py-6">
                            لا توجد نتائج
                          </p>
                        ) : (
                          <p className="text-center text-sm text-[var(--text-muted)] py-6">
                            اكتب اسم الطالب للبحث
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-soft)]">
                        <div className="w-9 h-9 rounded-full bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                          <User
                            size={16}
                            className="text-[var(--primary)]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-[var(--text-primary)]">
                            {selectedRecipient.name}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">
                            {selectedRecipient.role === "student"
                              ? "طالب"
                              : selectedRecipient.role === "teacher"
                                ? "أستاذ"
                                : selectedRecipient.role}
                            {selectedRecipient.class_name
                              ? ` · ${selectedRecipient.class_name}`
                              : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedRecipient(null)}
                          className="text-[var(--text-muted)] hover:text-[var(--danger)] transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <textarea
                        value={newMsgBody}
                        onChange={(e) => setNewMsgBody(e.target.value)}
                        placeholder="اكتب رسالتك..."
                        rows={3}
                        autoFocus
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] p-3 text-sm resize-none"
                      />

                      <button
                        onClick={() => void startConversation()}
                        disabled={creatingConv || !newMsgBody.trim()}
                        className="w-full h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition hover:opacity-90"
                        style={{ background: "var(--primary)" }}
                      >
                        {creatingConv ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <>
                            <Send size={14} />
                            إرسال
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
