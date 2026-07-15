import { Hono } from 'hono';
import { redis, context } from '@devvit/web/server';
import type { DailyFrequencyResponse } from '../../shared/api';
import { encodeString } from '../../shared/morse';
import { ensureStickyBoardComment } from '../core/boardComment';
import {
  issueDailyToken,
  resolveMemberId,
  resolveUsername,
} from '../core/dailyBoard';

// Bump when WORDS changes so cached daily words from an old list are ignored.
const DAILY_WORD_VERSION = 2;

const WORDS = [
  'PARIS', 'CODE', 'MORSE', 'ALERT', 'RADIO', 'TONE', 'WIRE', 'BAND', 'WAVE',
  'FREQ', 'TUBE', 'COIL', 'POWER', 'NOISE', 'CALL', 'TEST', 'HELLO', 'WORLD',
  'GAME', 'LEARN', 'DAILY', 'SEND', 'SOUND', 'PITCH', 'SPEED', 'KEYS', 'DITS',
  'DAHS', 'ANTS', 'EARTH', 'HISS', 'RELAY', 'RIGS', 'BEST', 'LOVE', 'FORUM',
  'DRILL', 'HERTZ', 'KEYUP', 'COPY', 'TAPS', 'AUDIO', 'BEEP', 'BUZZ', 'CLICK',
  'NODE', 'MODEM', 'CABLE', 'PHONE', 'VOICE', 'MICS', 'SPEAK', 'HEAR', 'TALK',
  'CHAT', 'ECHO', 'MASTS', 'YAGI', 'VERT', 'LOOP', 'WHIP', 'FEED', 'COAX',
  'WATTS', 'AMPS', 'VOLT', 'OHMS', 'GAIN', 'TUNE', 'DIAL', 'KNOB', 'SCAN',
  'CHAN', 'PORT', 'LINK', 'GRID', 'NETS', 'CLUB', 'MEET', 'LOGS', 'CARD',
  'POST', 'MAIL', 'NOTE', 'MESG', 'TEXT', 'DATA', 'BITS', 'SITE', 'HOST',
  'CLOUD', 'PEER', 'SYNC', 'PING', 'ROUTE', 'HASH', 'QUERY', 'FRAME', 'BURST',
  'FLOW',
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
  const cached = await redis.get(`daily:v${DAILY_WORD_VERSION}:${today}`);

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
    await redis.set(`daily:v${DAILY_WORD_VERSION}:${today}`, JSON.stringify(data));
  }

  // Await sticky ensure — fire-and-forget dies when the handler returns
  if (context.postId) {
    try {
      await ensureStickyBoardComment(context.postId);
    } catch (err) {
      console.error('ensureSticky on daily-frequency:', err);
    }
  }

  // Issue a per-day anti-cheat token tied to the member (echoed on submit).
  let token: string | undefined;
  try {
    const username = await resolveUsername();
    const memberId = resolveMemberId(username);
    if (memberId) {
      token = await issueDailyToken(memberId, today);
    }
  } catch (err) {
    console.error('issueDailyToken failed:', err);
  }

  return c.json<DailyFrequencyResponse>({
    type: 'daily-frequency',
    date: today,
    token,
    data,
  });
});
