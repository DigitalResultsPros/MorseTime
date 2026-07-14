import { redis, reddit, context } from '@devvit/web/server';
import {
  buildEntries,
  formatBoardCommentMarkdown,
  stickyCommentKey,
  stickyThrottleKey,
  todayUtc,
  TOP_N,
  getParticipantCount,
} from './dailyBoard';

/** Minimum seconds between sticky edits (unless force). */
const STICKY_THROTTLE_SEC = 20;

/** Reddit fullname helpers — post/comment APIs expect t3_/t1_ ids. */
function asPostId(postId: string): `t3_${string}` {
  const id = postId.startsWith('t3_') ? postId : `t3_${postId}`;
  return id as `t3_${string}`;
}

function asCommentId(commentId: string): `t1_${string}` {
  const id = commentId.startsWith('t1_') ? commentId : `t1_${commentId}`;
  return id as `t1_${string}`;
}

async function pinComment(commentId: string): Promise<boolean> {
  try {
    const comment = await reddit.getCommentById(asCommentId(commentId));
    if (comment.isStickied() && comment.isDistinguished()) {
      return true;
    }
    await comment.distinguish(true);
    return true;
  } catch (err) {
    console.error('pinComment failed:', commentId, err);
    return false;
  }
}

/**
 * Ensure this post has a stickied leaderboard comment. Creates + distinguishes if missing.
 * Returns the sticky comment id, or null on failure.
 *
 * Must be **awaited** inside the request — fire-and-forget is killed when the handler returns.
 */
export async function ensureStickyBoardComment(postId: string): Promise<string | null> {
  if (!postId) return null;

  const key = stickyCommentKey(postId);
  const existing = await redis.get(key);

  if (existing) {
    // Re-pin if someone unstickied or distinguish failed earlier
    const pinned = await pinComment(existing);
    if (pinned) return existing;

    // Stale / deleted comment — clear and recreate
    console.warn('Sticky id stale, recreating:', existing);
    await redis.del(key);
  }

  const date = todayUtc();
  const entries = await buildEntries(date, TOP_N);
  const participants = await getParticipantCount(date);
  const text = formatBoardCommentMarkdown(date, entries, participants);

  try {
    console.log('Creating sticky leaderboard on', postId);
    const comment = await reddit.submitComment({
      id: asPostId(postId),
      text,
      runAs: 'APP',
    });

    const pinned = await pinComment(comment.id);
    if (!pinned) {
      // Still try distinguish on the returned object (same API)
      try {
        await comment.distinguish(true);
      } catch (err) {
        console.error(
          'Could not sticky leaderboard comment (app needs mod + permissions.reddit.scope=moderator):',
          err
        );
      }
    }

    await redis.set(key, comment.id);
    await redis.expire(key, 60 * 60 * 24 * 14);
    console.log('Sticky leaderboard ready:', comment.id, 'pinned?', pinned);
    return comment.id;
  } catch (err) {
    console.error('Failed to create sticky leaderboard comment on', postId, err);
    return null;
  }
}

/**
 * Rebuild sticky markdown from Redis ranks and edit the comment.
 * Throttled unless `force` (e.g. new personal best).
 */
export async function syncStickyBoardComment(options?: {
  postId?: string;
  force?: boolean;
}): Promise<{ updated: boolean; commentId: string | null }> {
  const postId = options?.postId ?? context.postId;
  if (!postId) {
    return { updated: false, commentId: null };
  }

  const force = options?.force ?? false;
  const throttleKey = stickyThrottleKey(postId);

  if (!force) {
    const throttled = await redis.get(throttleKey);
    if (throttled) {
      const commentId = (await redis.get(stickyCommentKey(postId))) ?? null;
      return { updated: false, commentId };
    }
  }

  let commentId: string | null = (await redis.get(stickyCommentKey(postId))) ?? null;
  if (!commentId) {
    commentId = await ensureStickyBoardComment(postId);
    if (!commentId) return { updated: false, commentId: null };
    await redis.set(throttleKey, '1');
    await redis.expire(throttleKey, STICKY_THROTTLE_SEC);
    return { updated: true, commentId };
  }

  const date = todayUtc();
  const entries = await buildEntries(date, TOP_N);
  const participants = await getParticipantCount(date);
  const text = formatBoardCommentMarkdown(date, entries, participants);

  try {
    const comment = await reddit.getCommentById(asCommentId(commentId));
    await comment.edit({ text });
    if (!comment.isStickied() || !comment.isDistinguished()) {
      await pinComment(commentId);
    }
    await redis.set(throttleKey, '1');
    await redis.expire(throttleKey, STICKY_THROTTLE_SEC);
    return { updated: true, commentId };
  } catch (err) {
    console.error('Failed to edit sticky leaderboard; recreating:', err);
    await redis.del(stickyCommentKey(postId));
    const recreated = await ensureStickyBoardComment(postId);
    return { updated: Boolean(recreated), commentId: recreated };
  }
}

/**
 * Post a score brag as a **reply to the sticky** (Devvit user-actions pattern), as the user.
 */
export async function shareScoreComment(options: {
  elapsedMs: number;
  wpm: number;
  rank: number;
  improved?: boolean;
}): Promise<{ commentId: string; permalink: string }> {
  const postId = context.postId;
  if (!postId) {
    throw new Error('postId missing — open the daily post to share');
  }

  let stickyId: string | null = (await redis.get(stickyCommentKey(postId))) ?? null;
  if (!stickyId) {
    stickyId = await ensureStickyBoardComment(postId);
  }
  if (!stickyId) {
    throw new Error('Could not find leaderboard comment to reply under');
  }

  // Keep the official board the only sticky
  await pinComment(stickyId);

  const rankBit = options.rank > 0 ? ` · #${options.rank} today` : '';
  const bestBit = options.improved ? ' (new best!)' : '';
  const text = [
    `I copied today's word in **${options.elapsedMs.toLocaleString()} ms** (${options.wpm.toFixed(1)} WPM)${rankBit}${bestBit} 📻`,
    '',
    'Beat me?',
  ].join('\n');

  const comment = await reddit.submitComment({
    id: asCommentId(stickyId),
    text,
    runAs: 'USER',
  });

  return {
    commentId: comment.id,
    permalink: comment.permalink.startsWith('http')
      ? comment.permalink
      : `https://www.reddit.com${comment.permalink}`,
  };
}
