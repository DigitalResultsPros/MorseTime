import { reddit, context } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'MorseTime - Daily Frequency',
    subredditName: context.subredditName,
    userGeneratedContent: {
      text: 'Welcome to MorseTime! Learn Morse code by touch and sound. Tap the canvas or press Space/Enter to send Morse code. Today\'s frequency is ready to receive.',
    },
  });
};
