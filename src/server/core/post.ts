import { reddit, context } from '@devvit/web/server';
import { ensureStickyBoardComment } from './boardComment';

export const createPost = async (subredditName?: string) => {
  const date =
    new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);

  const subreddit = subredditName ?? context.subredditName;
  if (!subreddit) {
    throw new Error('No subreddit available to create the daily post');
  }

  const post = await reddit.submitCustomPost({
    title: `MorseTime — Today's Frequency (${date})`,
    subredditName: subreddit,
    userGeneratedContent: {
      text: "Welcome to MorseTime! Listen to today's transmission, then key it back letter by letter. Fastest correct times land on the pinned leaderboard.",
    },
  });

  // Sticky auto-updating board at top of comments
  try {
    await ensureStickyBoardComment(post.id);
  } catch (err) {
    console.error('Sticky leaderboard create failed on post create:', err);
  }

  return post;
};
