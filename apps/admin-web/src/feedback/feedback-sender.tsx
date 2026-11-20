import type { AdminFeedbackDto } from "@pilates/api-contracts";
import { Link } from "@tanstack/react-router";
import { TextLink } from "../components/ui/text-link";

/**
 * Walkthrough finding 88: who sent a Feedback. A Client's name opens her file
 * in Clientes (searched by her email, so the list holds her); a Staff
 * Member's name is plain text.
 */
export function FeedbackSender({ feedback }: { feedback: AdminFeedbackDto }) {
  // `== null`: an API older than this field sends none.
  if (feedback.senderClientId == null) {
    return <span>{feedback.senderName}</span>;
  }
  return (
    <TextLink asChild inline className="rounded-control">
      <Link
        to="/clientas"
        search={{ q: feedback.senderEmail, cliente: feedback.senderClientId }}
        onClick={(event) => event.stopPropagation()}
      >
        {feedback.senderName}
      </Link>
    </TextLink>
  );
}
