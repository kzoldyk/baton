import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-zinc-950 p-8 text-center">
          <div className="max-w-md space-y-4">
            <div className="text-4xl">⚠</div>
            <h1 className="text-lg font-semibold text-zinc-100">Something went wrong</h1>
            <p className="text-sm text-zinc-500">{this.state.error.message}</p>
            <button
              className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700"
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
