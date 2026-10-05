"use client";

import { useState } from "react";
import {
  ConversationSession,
  type ConversationMessage,
} from "@/components/conversation/ConversationSession";
import {
  ConversationReport,
  type ConversationFeedback,
} from "@/components/conversation/ConversationReport";

export function ConversationPageClient({
  conversationId,
  initialMessages,
  initiallyEnded,
  initialFeedback,
}: {
  conversationId: string;
  initialMessages: ConversationMessage[];
  initiallyEnded: boolean;
  initialFeedback: ConversationFeedback | null;
}) {
  const [alreadyEnded, setAlreadyEnded] = useState(initiallyEnded);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(
    initialFeedback
  );

  async function handleExit() {
    const res = await fetch(`/api/conversations/${conversationId}/end`, {
      method: "POST",
    });
    const data = await res.json();
    setFeedback(data.feedback ?? null);
    setAlreadyEnded(true);
  }

  if (alreadyEnded) {
    return <ConversationReport feedback={feedback} />;
  }

  return (
    <ConversationSession
      conversationId={conversationId}
      initialMessages={initialMessages}
      onExit={handleExit}
    />
  );
}
