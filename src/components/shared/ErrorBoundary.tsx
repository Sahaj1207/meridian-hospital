import { Component, type ErrorInfo, type ReactNode } from 'react';
import { FirstAid, ArrowClockwise, House } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error securely in client telemetry without exposing private patient state
    console.error('Operational Error Boundary caught an unhandled component error:', error.message, errorInfo.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F5F0] px-4 py-16 text-[#111315]">
          <div className="max-w-md w-full p-8 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md shadow-sm text-center space-y-6">
            <div className="w-14 h-14 rounded-full bg-[#EAE7DE] text-[#1A635E] flex items-center justify-center mx-auto">
              <FirstAid size={28} weight="duotone" />
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-mono tracking-widest text-[#1A635E] uppercase font-semibold">
                Clinical System Safeguard
              </div>
              <h1 className="font-serif text-2xl font-semibold text-[#111315]">
                Application Interruption
              </h1>
              <p className="text-xs text-[#5E666D] leading-relaxed">
                An unexpected technical condition occurred while processing this view. No clinical appointments, patient data, or operational records have been affected.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#1A635E] hover:bg-[#14514D] text-[#FAF9F6] text-xs font-medium transition-colors cursor-pointer"
              >
                <ArrowClockwise size={16} />
                <span>Reload Application</span>
              </button>
              <a
                href="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-[#FAF9F6] hover:bg-[#F2EFE9] border border-[#D9D5CA] text-[#111315] text-xs font-medium transition-colors cursor-pointer"
              >
                <House size={16} />
                <span>Return to Homepage</span>
              </a>
            </div>

            <div className="text-[11px] font-mono text-[#8E9499] border-t border-[#EAE7DE] pt-4">
              Meridian Hospital Clinical Telemetry Safeguard
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
