"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { StudentShell } from "@/components/StudentShell";
import { getLocaleFromPath } from "@/lib/locale-routing";
import {
  fetchJsonWithAuthorizedSession,
  fetchWithAuthorizedSession,
} from "@/lib/authorized-api";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt: string;
  isOwn: boolean;
}

function formatTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const POLL_INTERVAL_MS = 10_000;

export default function StudentConversationPage() {
  const pathname = usePathname();
  const router = useRouter();
  const { threadId } = useParams<{ threadId: string }>();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [otherName, setOtherName] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchMessages = useCallback(async () => {
    const res = await fetchJsonWithAuthorizedSession(
      `/api/student/messages/${threadId}`,
    );
    if (res.response.ok) {
      const data = (res.payload as any)?.data ?? [];
      setMessages(data);

      // Derive other participant name from first message not from self
      const otherMsg = data.find((m: Message) => !m.isOwn);
      if (otherMsg) setOtherName(otherMsg.senderName);
    }
  }, [threadId]);

  // Initial load
  useEffect(() => {
    fetchMessages()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Poll for new messages every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchMessages().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchMessages]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body || sending) return;

    setSending(true);
    setInput("");

    try {
      const res = await fetchWithAuthorizedSession(
        `/api/student/messages/${threadId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );

      const json = await res.json().catch(() => null);
      if (res.ok && json?.data) {
        setMessages((prev) => [...prev, json.data as Message]);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const BackArrow = isAr ? ArrowRight : ArrowLeft;

  return (
    <StudentShell
      currentPath="/student/messages"
      titleAr="المحادثة"
      titleEn="Conversation"
    >
      <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-[var(--card-border)]">
          <button
            onClick={() => router.push(`/${locale}/student/messages`)}
            className="shrink-0 p-1.5 rounded-lg hover:bg-[var(--surface-soft)] transition-colors"
            aria-label={t("رجوع", "Back")}
          >
            <BackArrow className="h-5 w-5 text-[var(--text-primary)]" />
          </button>
          {otherName && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 h-8 w-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-semibold">
                {otherName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "?"}
              </div>
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {otherName}
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-4 space-y-3"
        >
          {loading ? (
            <div className="space-y-3 px-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-10 rounded-xl animate-pulse ${
                    i % 2 === 0
                      ? "w-3/5 bg-[var(--surface-soft)] self-start"
                      : "w-2/5 bg-[var(--primary)]/20 ms-auto"
                  }`}
                  style={i % 2 !== 0 ? { marginInlineStart: "auto" } : {}}
                />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[var(--text-muted)]">
                {t(
                  "لا توجد رسائل بعد. ابدأ المحادثة!",
                  "No messages yet. Start the conversation!",
                )}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                    msg.isOwn
                      ? "bg-[var(--primary)] text-white rounded-ee-md"
                      : "bg-[var(--surface-soft)] text-[var(--text-primary)] rounded-es-md"
                  }`}
                >
                  {!msg.isOwn && (
                    <p className="text-[11px] font-medium text-[var(--text-secondary)] mb-0.5">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.body}
                  </p>
                  <p
                    className={`text-[10px] mt-1 ${
                      msg.isOwn
                        ? "text-white/70"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="pt-3 border-t border-[var(--card-border)]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("اكتب رسالة...", "Type a message...")}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-full border border-[var(--card-border)] bg-[var(--card-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="shrink-0 h-10 w-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              aria-label={t("إرسال", "Send")}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </StudentShell>
  );
}
