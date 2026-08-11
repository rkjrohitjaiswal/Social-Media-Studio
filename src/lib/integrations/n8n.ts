import { dispatchN8nEvent, N8nSupportedEventType } from "./n8n/event-dispatcher";

export async function deliverN8nWebhook(
  workspaceId: string,
  eventType: N8nSupportedEventType,
  data: Record<string, unknown>
) {
  return dispatchN8nEvent({
    workspaceId,
    eventType,
    data,
  });
}
