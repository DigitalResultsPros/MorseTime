import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { createPost } from '../core/post';

export const scheduler = new Hono();

/**
 * Daily cron (see devvit.json `scheduler.tasks.daily-frequency-post`).
 * Creates a fresh "Today's Frequency" post each day with its sticky board.
 */
scheduler.post('/daily-frequency-post', async (c) => {
  try {
    const input = await c.req.json<TaskRequest<{ subreddit?: string }>>();
    const post = await createPost(input.data?.subreddit);
    console.log('Daily frequency post created by scheduler:', post.id);
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  } catch (err) {
    console.error('Daily frequency scheduler failed:', err);
    // Return 200 so the gateway does not retry-spam a failing job.
    return c.json<TaskResponse>({ status: 'error' }, 200);
  }
});
