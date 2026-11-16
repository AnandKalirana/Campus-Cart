"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import type { ConversationWithDetails, MessageWithSender } from "@/services/messaging-service";

interface Props {
  /** The signed-in user, from the server. "Mine or theirs" is decided from this, never from a flag a response might carry. */
  viewerId: string;
  initialConversation: ConversationWithDetails;
  initialMessages: MessageWithSender[];
  nextCursor: string | null;
}

const GROUP_GAP_MS = 5 * 60_000;
const t = (d: Date | string) => new Date(d).getTime();

const timeLabel = (d: Date | string) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
function dayLabel(d: Date | string) {
  const date = new Date(d), today = new Date(), yest = new Date(); yest.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yest.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

export function ConversationThread({ viewerId, initialConversation, initialMessages, nextCursor }: Props) {
  const router = useRouter();
  const conversation = initialConversation;
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(!!nextCursor);
  const [olderCursor, setOlderCursor] = useState(nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // only auto-scroll when the reader is already at the bottom
  const lastRef = useRef(messages[messages.length - 1]);
  useEffect(() => { lastRef.current = messages[messages.length - 1]; }, [messages]);

  const merge = useCallback((incoming: MessageWithSender[]) => {
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      return fresh.length ? [...prev, ...fresh].sort((a, b) => t(a.createdAt) - t(b.createdAt)) : prev;
    });
  }, []);

  // Live updates: ask only for messages newer than the last one we have.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.hidden) return;
      const last = lastRef.current;
      const q = last ? `after=${encodeURIComponent(new Date(last.createdAt).toISOString())}` : "";
      try {
        const res = await fetch(`/api/conversations/${conversation.id}/messages?${q}`, { cache: "no-store" });
        if (res.status === 401 || res.status === 404) { if (!stopped) router.refresh(); return; } // session changed or thread gone
        const data = await res.json().catch(() => null);
        if (!stopped && data?.ok && data.messages.length) merge(data.messages);
      } catch { /* try again next tick */ }
    };
    const id = setInterval(poll, 5000);
    return () => { stopped = true; clearInterval(id); };
  }, [conversation.id, merge, router]);

  // Mark what they sent as read while this thread is open.
  const unreadFromThem = useMemo(() => messages.filter(m => m.senderId !== viewerId && !m.readAt), [messages, viewerId]);
  useEffect(() => {
    if (!unreadFromThem.length || document.hidden) return;
    const last = unreadFromThem[unreadFromThem.length - 1];
    fetch(`/api/conversations/${conversation.id}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId: last.id }) })
      .then(r => { if (r.ok) setMessages(prev => prev.map(m => m.senderId !== viewerId && !m.readAt ? { ...m, readAt: new Date() } : m)); })
      .catch(() => undefined);
  }, [unreadFromThem, conversation.id, viewerId]);

  useEffect(() => { if (stick.current) endRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  async function loadOlder() {
    if (!hasMore || loadingMore || !olderCursor) return;
    setLoadingMore(true);
    const box = listRef.current; const before = box?.scrollHeight ?? 0;
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages?cursor=${encodeURIComponent(olderCursor)}&limit=50`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (data?.ok) {
        stick.current = false;
        merge(data.messages); setOlderCursor(data.nextCursor); setHasMore(!!data.nextCursor);
        requestAnimationFrame(() => { if (box) box.scrollTop = box.scrollHeight - before; }); // keep the reader's place
      }
    } finally { setLoadingMore(false); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true); setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/reply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data.message) {
        if (data.message.senderId !== viewerId) { // another account logged in from this browser: this page is stale
          setError("You're logged in as a different account in this browser. Reloading…"); router.refresh(); return;
        }
        stick.current = true; merge([data.message]); setText("");
      } else if (res.status === 401) { router.push(`/login?next=${encodeURIComponent(`/messages/${conversation.id}`)}`); }
      else setError(res.status === 429 ? "You're sending a lot of messages. Try again in a bit." : data?.message ?? "Couldn't send. Please try again.");
    } catch { setError("Couldn't reach the server. Check your connection and try again."); }
    finally { setSending(false); }
  }

  // The newest message of mine gets the "Seen" / "Sent" line, like Instagram.
  const lastMineId = [...messages].reverse().find(m => m.senderId === viewerId)?.id;
  const them = conversation.otherPartyName;
  const themInitial = them.charAt(0).toUpperCase();

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[480px] flex-col">
      <header className="mb-4 flex shrink-0 items-center gap-3 border-4 border-black bg-white p-3 md:p-4">
        <Link href="/messages" className="bru-btn h-10 w-10 p-0" aria-label="Back to messages"><ArrowLeft size={20} aria-hidden /></Link>
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-black bg-cc-sky font-raw">{themInitial}</span>
        <div className="min-w-0 flex-1">
          <h1 className="font-raw truncate text-base leading-tight">{them}</h1>
          <p className="truncate text-xs font-bold">
            <Link href={`/products/${conversation.productId}`} className="underline decoration-2 underline-offset-2 hover:bg-black hover:text-white">{conversation.productTitle}</Link> · {formatINR(conversation.productPrice)}
          </p>
        </div>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto border-4 border-black bg-white/60 px-3 py-4 md:px-5" role="log" aria-label={`Conversation with ${them}`} aria-live="polite"
        onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; if (el.scrollTop < 40) loadOlder(); }}>
        {hasMore && <button type="button" onClick={loadOlder} disabled={loadingMore} className="mx-auto mb-4 block text-xs font-bold underline decoration-2 underline-offset-2">{loadingMore ? "Loading…" : "Load earlier messages"}</button>}
        {messages.length === 0 && <p className="py-10 text-center text-sm font-bold">No messages yet. Say hi.</p>}
        {messages.map((m, i) => {
          const mine = m.senderId === viewerId;
          const prev = messages[i - 1], next = messages[i + 1];
          const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          const startsGroup = newDay || prev.senderId !== m.senderId || t(m.createdAt) - t(prev.createdAt) > GROUP_GAP_MS;
          const endsGroup = !next || next.senderId !== m.senderId || t(next.createdAt) - t(m.createdAt) > GROUP_GAP_MS || new Date(next.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          return (
            <div key={m.id}>
              {newDay && <p className="my-4 text-center text-xs font-bold"><span className="border-2 border-black bg-white px-3 py-0.5">{dayLabel(m.createdAt)}</span></p>}
              <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"} ${startsGroup ? "mt-3" : "mt-1"}`}>
                {!mine && (endsGroup
                  ? <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-black bg-cc-sky text-xs font-raw">{themInitial}</span>
                  : <span aria-hidden className="w-7 shrink-0" />)}
                <div className={`max-w-[78%] md:max-w-[65%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  <p className="sr-only">{mine ? "You" : m.senderName} at {timeLabel(m.createdAt)}:</p>
                  <p className={`whitespace-pre-wrap border-2 border-black px-4 py-2 text-[15px] font-bold leading-snug [overflow-wrap:anywhere] ${mine ? "rounded-3xl bg-cc-orange text-black" : "rounded-3xl bg-white text-black"} ${mine && endsGroup ? "rounded-br-md" : ""} ${!mine && endsGroup ? "rounded-bl-md" : ""}`}>{m.body}</p>
                  {(endsGroup || m.id === lastMineId) && (
                    <p className="mt-1 px-1 text-[11px] font-bold text-cc-muted">
                      {timeLabel(m.createdAt)}{mine && m.id === lastMineId ? ` · ${m.readAt ? "Seen" : "Sent"}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-4 shrink-0 border-4 border-black bg-white p-3">
        {error && <p role="alert" className="mb-2 border-2 border-black bg-cc-pink p-2 text-sm font-bold">{error}</p>}
        <div className="flex gap-2">
          <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder={`Message ${them}…`} className="bru-input flex-1" maxLength={2000} aria-label="Message" autoComplete="off" />
          <button type="submit" aria-label="Send message" className="bru-btn h-12 bg-black px-4 text-white" disabled={sending || !text.trim()}><Send size={20} aria-hidden /></button>
        </div>
      </form>
    </div>
  );
}
