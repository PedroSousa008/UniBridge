import { requireSession } from '@/lib/session';
import { subscribePartnershipLive } from '@/lib/partnerships/partnership-live-bus';
import { partnershipLiveHeartbeat } from '@/lib/partnerships/partnership-live-hub';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const session = await requireSession();
  const userId = session.user.id;

  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send(partnershipLiveHeartbeat());

      unsubscribe = subscribePartnershipLive(userId, (event) => {
        send(event);
      });

      heartbeat = setInterval(() => {
        send(partnershipLiveHeartbeat());
      }, 15000);
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
