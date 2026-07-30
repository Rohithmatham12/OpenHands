import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import AutomationService from "#/api/automation-service/automation-service.api";
import { ActivityLogSection } from "#/components/features/automations/detail/activity-log-section";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";
import type { Automation, AutomationRun } from "#/types/automation";
import { AutomationRunStatus } from "#/types/automation";

const { downloadBlobMock } = vi.hoisted(() => ({
  downloadBlobMock: vi.fn(),
}));

vi.mock("#/utils/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("#/utils/utils")>();
  return {
    ...actual,
    downloadBlob: downloadBlobMock,
  };
});

const automation: Automation = {
  id: "automation-1",
  name: "Daily review",
  trigger: { type: "cron", schedule: "0 9 * * *" },
  enabled: true,
  created_at: "2026-01-01T10:00:00Z",
  updated_at: "2026-01-01T10:00:00Z",
  prompt: "Review open pull requests.",
};

function makeRun(id: string): AutomationRun {
  return {
    id,
    status: AutomationRunStatus.COMPLETED,
    conversation_id: `conv-${id}`,
    bash_command_id: `cmd-${id}`,
    error_detail: null,
    started_at: "2026-01-01T10:00:00Z",
    completed_at: "2026-01-01T10:02:00Z",
  };
}

function renderSection() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <ActiveBackendProvider>
        <ActivityLogSection automation={automation} />
      </ActiveBackendProvider>
    </QueryClientProvider>,
  );
}

describe("ActivityLogSection export", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    downloadBlobMock.mockReset();
  });

  it("downloads all activity runs when the loaded page is incomplete", async () => {
    const user = userEvent.setup();
    vi.spyOn(AutomationService, "getAutomationRuns")
      .mockResolvedValueOnce({ runs: [makeRun("1")], total: 2 })
      .mockResolvedValueOnce({ runs: [makeRun("1"), makeRun("2")], total: 2 });

    renderSection();

    await screen.findByText(/January 1, 2026/);
    await user.click(
      screen.getByRole("button", { name: "AUTOMATIONS$EXPORT" }),
    );

    await waitFor(() => expect(downloadBlobMock).toHaveBeenCalled());
    expect(AutomationService.getAutomationRuns).toHaveBeenLastCalledWith(
      automation.id,
      2,
      0,
    );
    expect(downloadBlobMock).toHaveBeenCalledWith(
      expect.any(Blob),
      "automation-1-activity-log.json",
    );
  });
});
