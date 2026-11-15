"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { formatINR } from "@/lib/catalog";
import { Resp } from "@/components/ui/resp";
import type { ConversationWithDetails } from "@/services/messaging-service";

interface ConversationListProps {
  initialConversations: ConversationWithDetails[];
}

export function ConversationList({ initialConversations }: ConversationListProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.conversations) {
          setConversations(data.conversations);
        }
      }
    } catch {
      // silent fail for background refresh
    }
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(refreshUnread, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refreshUnread]);

  if (conversations.length === 0) {
    return (
      <div className="bru-card p-12 text-center">
        <p className="font-raw text-2xl mb-2">No conversations yet</p>
        <p className="text-lg font-bold text-cc-muted mb-6 max-w-md mx-auto">When you ask about a listing or someone asks about yours, it&apos;ll appear here.</p>
        <Link href="/marketplace" className="bru-btn h-12 bg-black px-6 text-base inline-flex text-white">Browse marketplace</Link>
      </div>
    );
  }

  return (
    <div className="bru-card overflow-hidden">
      <ul className="divide-y-4 divide-black" role="list" aria-label="Conversations">
        {conversations.map(c => (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="bru-card-lift flex gap-4 p-4 hover:bg-[#fef9c3] transition-colors"
              aria-current={c.unreadCount > 0 ? "true" : undefined}
            >
              <div className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full border-2 border-black bg-cc-sky font-raw text-lg">
                {c.productImage ? (
                  <Image src={c.productImage} alt="" fill sizes="48px" className="rounded-full object-cover" />
                ) : (
                  c.otherPartyName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-raw text-sm truncate">{c.otherPartyName}</span>
                  <time className="text-xs font-bold text-cc-muted whitespace-nowrap" dateTime={c.lastMessageTime.toISOString()}>
                    {formatRelativeTime(c.lastMessageTime)}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-raw inline-block border-2 border-black bg-cc-yellow px-2 py-0.5 text-[10px] truncate max-w-[200px]">
                    {c.productTitle}
                  </span>
                  <span className="font-raw text-xs text-cc-muted whitespace-nowrap">{formatINR(c.productPrice)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-bold text-cc-muted">
                  {c.lastMessage ?? <Resp mobile="Tap to start chatting" desktop="No messages yet" />}
                </p>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex-shrink-0 grid h-6 min-w-6 place-items-center self-center border-2 border-black bg-cc-sky px-1 text-xs font-bold" aria-label={`${c.unreadCount} unread`}>
                  {c.unreadCount > 99 ? "99+" : c.unreadCount}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}