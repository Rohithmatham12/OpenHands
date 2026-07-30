import { useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { useAutomationRuns } from "#/hooks/query/use-automation-detail";
import AutomationService from "#/api/automation-service/automation-service.api";
import ActivityIcon from "#/icons/activity.svg?react";
import DownloadIcon from "#/icons/download.svg?react";
import { downloadBlob } from "#/utils/utils";
import { ActivityLogItem } from "./activity-log-item";
import type { Automation } from "#/types/automation";

interface ActivityLogSectionProps {
  automation: Automation;
}

const PAGE_SIZE = 20;

export function ActivityLogSection({ automation }: ActivityLogSectionProps) {
  const { t } = useTranslation("openhands");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [isExporting, setIsExporting] = useState(false);
  const { data, isLoading } = useAutomationRuns({
    id: automation.id,
    limit,
    offset: 0,
  });

  const hasMore = data ? data.total > data.runs.length : false;
  const hasRuns = !!data && data.runs.length > 0;

  const handleExport = async () => {
    if (!data || data.total === 0) return;
    setIsExporting(true);
    try {
      const runs =
        data.runs.length >= data.total
          ? data.runs
          : (
              await AutomationService.getAutomationRuns(
                automation.id,
                data.total,
                0,
              )
            ).runs;
      const contents = `${JSON.stringify(
        {
          version: 1,
          kind: "automation_activity_log",
          automation: {
            id: automation.id,
            name: automation.name,
          },
          exported_at: new Date().toISOString(),
          total: runs.length,
          runs,
        },
        null,
        2,
      )}\n`;
      downloadBlob(
        new Blob([contents], { type: "application/json" }),
        `${automation.id}-activity-log.json`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--oh-border)] bg-[var(--oh-surface)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--oh-border)] px-5 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-4 text-muted">
            <ActivityIcon className="size-4" />
          </span>
          <h3 className="text-sm font-medium text-content">
            {t(I18nKey.AUTOMATIONS$DETAIL$ACTIVITY_LOG)}
          </h3>
        </div>
        <button
          type="button"
          disabled={!hasRuns || isExporting}
          onClick={handleExport}
          className="rounded-md p-1 text-muted hover:bg-surface-raised hover:text-foreground focus:bg-surface-raised focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t(I18nKey.AUTOMATIONS$EXPORT)}
          title={t(I18nKey.AUTOMATIONS$EXPORT)}
        >
          <DownloadIcon className="size-4" />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-1 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="flex items-center justify-between py-3"
            >
              <div className="h-5 w-64 animate-pulse rounded bg-surface-raised" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-surface-raised" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && data?.runs.length === 0 && (
        <p className="px-5 py-8 text-center text-sm text-muted">
          {t(I18nKey.AUTOMATIONS$DETAIL$NO_RUNS)}
        </p>
      )}

      {!isLoading && data && data.runs.length > 0 && (
        <div>
          {data.runs.map((run, index) => (
            <div
              key={run.id}
              className={index > 0 ? "border-t border-[var(--oh-border)]" : ""}
            >
              <ActivityLogItem run={run} automation={automation} />
            </div>
          ))}

          {hasMore && (
            <div className="border-t border-[var(--oh-border)] px-5 py-3">
              <button
                type="button"
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                className="text-sm text-muted hover:text-foreground"
              >
                {t(I18nKey.AUTOMATIONS$DETAIL$LOAD_MORE_RUNS)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
