import { Link } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';

interface PageShellProps {
  title: string;
  category: string;
  description: string;
  statusText?: string;
  children?: React.ReactNode;
}

export function PageShell({
  title,
  category,
  description,
  statusText = "Foundational Architecture Ready",
  children
}: PageShellProps) {
  return (
    <div className="py-12 sm:py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb path */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-medium text-[#5E666D]">
        <Link to="/" className="hover:text-[#1A635E] transition-colors">
          Home
        </Link>
        <CaretRight size={12} className="text-[#8E9499]" />
        <span className="text-[#1A635E]" aria-current="page">
          {category}
        </span>
      </nav>

      {/* Header section */}
      <div className="border-b border-[#E5E2D8] pb-8 mb-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#EDF5F4] text-[#1A635E] text-xs font-medium mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1A635E]"></span>
          <span>{statusText}</span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#111315] tracking-tight mb-4">
          {title}
        </h1>

        <p className="text-base sm:text-lg text-[#3C4247] max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>

      {/* Content slot */}
      {children}
    </div>
  );
}
