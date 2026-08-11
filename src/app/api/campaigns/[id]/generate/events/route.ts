import { getGenerationRunByCampaign } from "@/lib/queue/generation-worker";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: campaignId } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Send initial run state
      const initialRun = getGenerationRunByCampaign(campaignId);
      if (initialRun) {
        sendEvent({ type: "RUN_UPDATE", run: initialRun });
      }

      // Poll in-memory worker state for updates during active streaming session
      const interval = setInterval(() => {
        const currentRun = getGenerationRunByCampaign(campaignId);
        if (currentRun) {
          sendEvent({ type: "RUN_UPDATE", run: currentRun });
          if (
            currentRun.status === "COMPLETED" ||
            currentRun.status === "PARTIAL_FAILURE" ||
            currentRun.status === "FAILED"
          ) {
            clearInterval(interval);
            controller.close();
          }
        } else {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
