import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getConversations, getMessages } from "@/services/messaging-service";
import { ConversationThread } from "@/components/messages/conversation-thread";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/messages");
  const { id } = await params;

  const conversations = await getConversations();
  const conversation = conversations.find(c => c.id === id);
  if (!conversation) notFound();

  const { messages, nextCursor } = await getMessages(id);

  return (
    <section className="mx-auto max-w-[760px] px-5 pb-16 pt-12">
      <ConversationThread
        viewerId={user.id}
        initialConversation={conversation}
        initialMessages={messages}
        nextCursor={nextCursor}
      />
    </section>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  return <Suspense fallback={<div className="h-96" aria-busy="true" />}><ConversationPage {...props} /></Suspense>;
}