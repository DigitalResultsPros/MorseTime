import { reddit, context } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'MorseTime - Daily Frequency',
    subredditName: context.subredditName,
  });
};
