import { PageShell } from '@/components/shared/PageShell';
import { journalArticles } from '@/data/journal';
import { Clock } from '@phosphor-icons/react';

export function JournalPage() {
  return (
    <PageShell
      title="Meridian Clinical Journal"
      category="Journal"
      description="Clinical analyses, procedural reviews, and evidence-based guidance authored by hospital specialists."
      statusText="Journal Content Architecture"
    >
      <div className="space-y-6">
        {journalArticles.map((article) => (
          <article 
            key={article.id}
            className="p-6 bg-[#FAF9F6] border border-[#E5E2D8] rounded-md"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#8E9499] mb-3">
              <span className="font-semibold text-[#1A635E] uppercase tracking-wider">
                {article.category}
              </span>
              <span>&bull;</span>
              <span>{article.publishedAt}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                <span>{article.readTime}</span>
              </span>
            </div>

            <h2 className="font-display text-2xl font-semibold text-[#111315] mb-2">
              {article.title}
            </h2>

            <p className="text-sm text-[#3C4247] leading-relaxed mb-4 max-w-3xl">
              {article.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E5E2D8] text-xs">
              <span className="text-[#5E666D]">
                Author: <strong className="text-[#111315]">{article.author.name}</strong>, {article.author.role}
              </span>

              <div className="flex items-center gap-1.5">
                {article.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded bg-[#F4F2EC] text-[#5E666D]">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
