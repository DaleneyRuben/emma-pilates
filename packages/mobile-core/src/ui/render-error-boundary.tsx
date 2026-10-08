import { Component, type ErrorInfo, type ReactNode } from "react";

import { RecoveryScreen } from "./recovery-screen";

type RenderErrorBoundaryProps = { children: ReactNode };
type RenderErrorBoundaryState = { failed: boolean };

/**
 * The one class in the mobile packages: React exposes recovery from a render
 * error only through getDerivedStateFromError and componentDidCatch (MOB-053).
 * Reintentar mounts the children again from scratch; the error is reported
 * through console.error, which Expo shows as a LogBox notice in development.
 */
export class RenderErrorBoundary extends Component<
  RenderErrorBoundaryProps,
  RenderErrorBoundaryState
> {
  state: RenderErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("A screen failed while rendering", error, info.componentStack);
  }

  retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    return this.state.failed ? <RecoveryScreen onRetry={this.retry} /> : this.props.children;
  }
}

/** A React Navigation `screenLayout`: each screen recovers on its own, the navigator stays. */
export function recoveryScreenLayout({ children }: { children: ReactNode }) {
  return <RenderErrorBoundary>{children}</RenderErrorBoundary>;
}
