"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft, MoreVertical } from "lucide-react";
import { formatINR } from "@/lib/catalog";
import type { ConversationWithDetails, MessageWithSender } from "@/services/messaging-service";

interface ConversationThreadProps {
  initialConversation: ConversationWithDetails;
  initialMessages: MessageWithSender[];
  nextCursor: string | null;
}

export function ConversationThread({ initialConversation, initialMessages, nextCursor }: ConversationThreadProps) {
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursorRef, setNextCursorRef] = useState(nextCursor);
  const [hasMore, setHasMore] = useState(!!nextCursor);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchNewMessages = useCallback(async () => {
    if (messages.length === 0) return;
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages?cursor=${messages[messages.length - 1].createdAt.toISOString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.messages.length > 0) {
          setMessages(prev => [...prev, ...data.messages]);
        }
      }
    } catch {
      // silent fail
    }
  }, [conversation.id, messages]);

  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursorRef) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages?cursor=${nextCursorRef}&limit=50`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setMessages(prev => [...data.messages.reverse(), ...prev]);
          setNextCursorRef(data.nextCursor);
          setHasMore(!!data.nextCursor);
        }
      }
    } catch {
      // silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [conversation.id, hasMore, loadingMore, nextCursorRef]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversation.productId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.message) {
          setMessages(prev => [...prev, data.message]);
          setNewMessage("");
        }
      }
    } catch {
      // error handled by form
    } finally {
      setSending(false);
    }
  }, [conversation.productId, newMessage, sending]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop === 0 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, loadMoreMessages]);

  const markRead = useCallback(async () => {
    const lastReceived = [...messages].reverse().find(m => !m.isOwn && !m.readAt);
    if (lastReceived) {
      try {
        await fetch(`/api/conversations/${conversation.id}/read`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: lastReceived.id }),
        });
        setMessages(prev => prev.map(m => m.id === lastReceived.id ? { ...m, readAt: new Date() } : m));
        setConversation(prev => ({ ...prev, unreadCount: Math.max(0, prev.unreadCount - 1) }));
      } catch {
        // silent fail
      }
    }
  }, [conversation.id, messages]);

  useEffect(() => {
    scrollToBottom();
    pollIntervalRef.current = setInterval(fetchNewMessages, 5000);
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [fetchNewMessages, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- markRead syncs read status on mount
    markRead();
  }, [markRead]);

  return (
    <div className="flex flex-col h-full min-h-[500px] md:min-h-[600px]">
      <header className="mb-4 flex items-center gap-3 border-4 border-black bg-white p-3 md:p-4 shrink-0">
        <button type="button" className="bru-btn h-10 w-10 p-0" onClick={() => window.history.back()} aria-label="Back">
          <ArrowLeft size={20} aria-hidden />
        </button>
        <div className="flex-1 min-w-0">
          <Link href={`/products/${conversation.productId}`} className="font-raw text-sm truncate block hover:underline">{conversation.productTitle}</Link>
          <p className="text-xs font-bold text-cc-muted">{formatINR(conversation.productPrice)} · {conversation.otherPartyName}</p>
        </div>
        <button type="button" className="bru-btn h-10 w-10 p-0 text-cc-muted hover:text-black" aria-label="More options">
          <MoreVertical size={20} aria-hidden />
        </button>
      </header>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 md:p-6"
        onScroll={handleScroll}
        aria-live="polite"
      >
        {loadingMore && <div className="text-center text-cc-muted py-2">Loading earlier messages…</div>}
        {hasMore && messages.length === 0 && <div className="text-center text-cc-muted py-2">No messages yet</div>}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.isOwn ? "flex-row-reverse" : ""}`}
            data-message-id={msg.id}
          >
            {!msg.isOwn && (
              <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border-2 border-black bg-cc-sky font-raw text-sm">
                {conversation.productImage ? (
                  <Image src={conversation.productImage} alt="" fill sizes="32px" className="rounded-full object-cover" />
                ) : (
                  conversation.otherPartyName.charAt(0).toUpperCase()
                )}
              </div>
            )}
            <div className={`max-w-[70%] ${msg.isOwn ? "text-right" : ""}`}>
              {!msg.isOwn && <p className="text-[10px] font-bold text-cc-muted mb-1">{msg.senderName}</p>}
              <div
                className={`inline-block px-4 py-2 rounded-2xl font-bold text-sm ${
                  msg.isOwn
                    ? "bg-black text-white rounded-tr-none"
                    : "bg-white text-black rounded-tl-none border-2 border-black"
                }`}
              >
                {msg.body}
              </div>
              <p className={`mt-1 text-[10px] font-bold text-cc-muted ${msg.isOwn ? "text-right" : ""}`}>
                {formatTime(msg.createdAt)}
                {msg.isOwn && msg.readAt && <span className="ml-1">✓✓</span>}
              </p>
            </div>
            {msg.isOwn && <div className="w-8 flex-shrink-0" />}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="border-t-4 border-black bg-white p-3 md:p-4 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message…"
            className="bru-input flex-1"
            disabled={sending}
            maxLength={2000}
            aria-label="Message"
          />
          <button type="submit" className="bru-btn h-12 bg-black px-4 text-white" disabled={sending || !newMessage.trim()}>
            <Send size={20} aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase();
}