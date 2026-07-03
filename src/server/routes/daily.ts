import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { DailyFrequencyResponse } from '../../shared/api';
import { encodeString } from '../../shared/morse';

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

  if (cached) {
    const data = JSON.parse(cached);
    return c.json<DailyFrequencyResponse>({
      type: 'daily-frequency',
      date: today,
      data,
    });
  }

  // Fallback: generate on the fly
  const word = selectDailyWord(today);
  const morse = encodeString(word).map((seq) => seq.join(' ')).join(' / ');
  const data = {
    word,
    morse,
    charWpm: 20,
    effectiveWpm: 5,
  };

  await redis.set(`daily:${today}`, JSON.stringify(data));

  return c.json<DailyFrequencyResponse>({
    type: 'daily-frequency',
    date: today,
    data,
  });
});
