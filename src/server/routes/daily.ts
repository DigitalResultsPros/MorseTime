import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';
import type { DailyFrequencyResponse } from '../../shared/api';
import { encodeString } from '../../shared/morse';
import { ensureStickyBoardComment } from '../core/boardComment';

const WORDS = [
  'PARIS', 'CODE', 'MORSE', 'SIGNAL', 'RADIO', 'TONE', 'KEY', 'DIT', 'DAH',
  'WIRE', 'BAND', 'WAVE', 'FREQ', 'TUBE', 'COIL', 'ANT', 'GROUND', 'POWER',
  'NOISE', 'STATIC', 'CALL', 'QTH', 'QRZ', '73', '88', 'TEST', 'HELLO',
  'WORLD', 'REDDIT', 'GAME', 'LEARN', 'PRACTICE', 'DAILY', 'FREQUENCY',
  'TRANSMIT', 'RECEIVE', 'SEND', 'TAP', 'LISTEN', 'SOUND', 'PITCH', 'SPEED',
];

export function selectDailyWord(date: string): string {
  // Deterministic word selection based on date
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = ((hash << 5) - hash) + date.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WORDS.length;
  return WORDS[index] ?? 'PARIS';
}

export const daily = new Hono();

daily.get('/daily-frequency', async (c) => {
  const today = new Date().toISOString().split('T')[0] || new Date().toISOString().slice(0, 10);
  const cached = await redis.get(`daily:${today}`);

  let data: {
    word: string;
    morse: string;
    charWpm: number;
    effectiveWpm: number;
  };

  if (cached) {
    data = JSON.parse(cached) as typeof data;
  } else {
    // Fallback: generate on the fly
    const word = selectDailyWord(today);
    const morse = encodeString(word)
      .map((seq) => seq.join(' '))
      .join(' / ');
    data = {
      word,
      morse,
      charWpm: 20,
      effectiveWpm: 20,
    };
    await redis.set(`daily:${today}`, JSON.stringify(data));
  }

  // Await sticky ensure — fire-and-forget dies when the handler returns
  if (context.postId) {
    try {
      await ensureStickyBoardComment(context.postId);
    } catch (err) {
      console.error('ensureSticky on daily-frequency:', err);
    }
  }

  return c.json<DailyFrequencyResponse>({
    type: 'daily-frequency',
    date: today,
    data,
  });
});
