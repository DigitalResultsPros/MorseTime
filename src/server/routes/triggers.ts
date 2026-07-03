import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, redis } from '@devvit/web/server';
import { createPost } from '../core/post';
import { selectDailyWord } from './daily';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/daily-frequency', async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
    const word = selectDailyWord(today);

    // Store in Redis for the splash to read
    await redis.set(`daily:${today}`, JSON.stringify({
      word,
      morse: word.split('').map((ch: string) => ch === ' ' ? '/' : ch).join(' '),
      charWpm: 20,
      effectiveWpm: 5,
    }));

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Daily frequency set to "${word}"`,
      },
      200
    );
  } catch (error) {
    console.error(`Error setting daily frequency: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to set daily frequency',
      },
      400
    );
  }
});
