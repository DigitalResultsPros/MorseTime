import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { ensureStickyBoardComment, syncStickyBoardComment } from '../core/boardComment';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/post-frequency', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
        showToast: 'Daily frequency post created!',
      },
      200
    );
  } catch (error) {
    console.error(`Error creating frequency post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create frequency post',
      },
      400
    );
  }
});

/** Moderator recovery: pin/refresh sticky board on the current post. */
menu.post('/pin-leaderboard', async (c) => {
  const postId = context.postId;
  if (!postId) {
    return c.json<UiResponse>(
      { showToast: 'Open a MorseTime post, then run this on that post' },
      400
    );
  }

  try {
    const commentId = await ensureStickyBoardComment(postId);
    if (!commentId) {
      return c.json<UiResponse>(
        { showToast: 'Could not create sticky (check app is moderator)' },
        400
      );
    }
    await syncStickyBoardComment({ postId, force: true });
    return c.json<UiResponse>(
      { showToast: 'Leaderboard pinned and refreshed' },
      200
    );
  } catch (error) {
    console.error('pin-leaderboard failed:', error);
    return c.json<UiResponse>(
      { showToast: 'Failed to pin leaderboard' },
      400
    );
  }
});

menu.post('/view-stats', async (c) => {
  return c.json<UiResponse>(
    {
      showToast: 'Stats coming soon!',
    },
    200
  );
});
