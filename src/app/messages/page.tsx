import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import { getConversations } from "@/services/messaging-service";
import { ConversationList } from "@/components/messages/conversation-list";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

async function MessagesPage() {
  await requireUser("/messages");
  const conversations = await getConversations();

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-12">
      <header className="mb-10">
        <p className="font-raw inline-block border-4 border-black bg-cc-sky px-3 py-1 text-xs tracking-widest md:text-sm">Conversations</p>
        <h1 className="font-raw mt-4 text-[clamp(2.25rem,6vw,3.75rem)] leading-[0.95]">The inbox</h1>
        <p className="mt-2 text-lg font-bold">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p>
      </header>

      <ConversationList initialConversations={conversations} />
    </section>
  );
}

export default function Page() {
  return <Suspense fallback={<div className="h-64" aria-busy="true" />}><MessagesPage /></Suspense>;
}
