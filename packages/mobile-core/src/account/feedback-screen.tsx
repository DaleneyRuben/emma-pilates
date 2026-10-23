import type { FeedbackMetadata } from "./feedback-metadata";

type FeedbackScreenProps = {
  fetcher: typeof globalThis.fetch;
  metadata: FeedbackMetadata;
  newIdempotencyKey?: () => string;
  onBack: () => void;
};

export function FeedbackScreen(props: FeedbackScreenProps) {
  void props;
  return null;
}
