import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { ArrowLeft, FirstAid, House } from '@phosphor-icons/react';

interface RouteErrorViewProps {
  is404?: boolean;
}

export function RouteErrorView({ is404 = false }: RouteErrorViewProps) {
  const error = useRouteError();

  let isNotFound = is404;
  let errorTitle = 'Page Not Found (404)';
  let errorDescription = 'The requested clinical, specialist, or administrative resource does not exist or has been relocated within the hospital directory.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      isNotFound = true;
    } else {
      isNotFound = false;
      errorTitle = `Service Notice (${error.status})`;
      errorDescription = 'An unexpected routing response occurred while accessing the hospital portal.';
    }
  } else if (error instanceof Error && !is404) {
    isNotFound = false;
    errorTitle = 'Service Notice';
    errorDescription = 'An unexpected condition occurred while processing this view. No patient or scheduling records were affected.';
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#F7F5F0] px-4 py-16 text-[#111315]">
      <div className="max-w-xl w-full p-8 sm:p-10 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md shadow-sm text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-[#EAE7DE] text-[#1A635E] flex items-center justify-center mx-auto">
          <FirstAid size={28} weight="duotone" />
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-mono tracking-widest text-[#1A635E] uppercase font-semibold">
            {isNotFound ? 'Directory Navigation Notice' : 'Clinical Portal Notice'}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#111315]">
            {errorTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#5E666D] leading-relaxed max-w-md mx-auto">
            {errorDescription}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#1A635E] hover:bg-[#134e4a] text-[#FAF9F6] text-xs font-medium tracking-wide transition-colors cursor-pointer"
          >
            <House size={16} />
            <span>Return to Homepage</span>
          </Link>
          <Link
            to="/find-care"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded bg-[#FAF9F6] hover:bg-[#F2EFE9] border border-[#D9D5CA] text-[#111315] text-xs font-medium tracking-wide transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Browse Clinical Directory</span>
          </Link>
        </div>

        <div className="text-[11px] font-mono text-[#8E9499] border-t border-[#EAE7DE] pt-4">
          Meridian Hospital Patient Care & Telemetry System
        </div>
      </div>
    </div>
  );
}
