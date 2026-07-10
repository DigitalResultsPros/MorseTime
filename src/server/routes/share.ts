import { Hono } from 'hono';
import type { ShareScoreRequest, ShareScoreResponse } from '../../shared/api';
import { MIN_ELAPSED_MS, MAX_ELAPSED_MS } from '../core/dailyBoard';
import { shareScoreComment } from '../core/boardComment';

export const share = new Hono();

share.post('/share-score', async (c) => {
  let body: ShareScoreRequest;
  try {
    body = await c.req.json<ShareScoreRequest>();
  } catch {
    return c.json({ status: 'error', message: 'Invalid JSON body' }, 400);
  }

  const elapsedMs = Math.round(Number(body.elapsedMs));
  const wpm = Number(body.wpm);
  const rank = Math.round(Number(body.rank ?? 0));
  const improved = Boolean(body.improved);

  if (!Number.isFinite(elapsedMs) || elapsedMs < MIN_ELAPSED_MS || elapsedMs > MAX_ELAPSED_MS) {
    return c.json({ status: 'error', message: 'Invalid elapsedMs' }, 400);
  }
  if (!Number.isFinite(wpm) || wpm < 0) {
    return c.json({ status: 'error', message: 'Invalid wpm' }, 400);
  }

  try {
    const { commentId, permalink } = await shareScoreComment({
      elapsedMs,
      wpm,
      rank,
      improved,
    });
    return c.json<ShareScoreResponse>({
      type: 'share-score',
      commentId,
      permalink,
    });
  } catch (err) {
    console.error('share-score failed:', err);
    const message = err instanceof Error ? err.message : 'Failed to post score';
    return c.json({ status: 'error', message }, 400);
  }
});
