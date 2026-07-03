/**
 * Koch method curriculum data — shared between client and server.
 */

export interface LessonDefinition {
  lessonNumber: number;
  newChars: string[];
  cumulative: string[];
  focus: string;
}

export const CURRICULUM: LessonDefinition[] = [
  { lessonNumber: 1, newChars: ['K', 'M'], cumulative: ['K', 'M'], focus: 'Rhythm foundation' },
  { lessonNumber: 2, newChars: ['R', 'S'], cumulative: ['K', 'M', 'R', 'S'], focus: 'Common letters' },
  { lessonNumber: 3, newChars: ['U', 'A', 'P', 'T'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T'], focus: 'Vowel + frequent' },
  { lessonNumber: 4, newChars: ['L', 'O', 'W', 'I'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I'], focus: 'High-frequency' },
  { lessonNumber: 5, newChars: ['.', 'N', 'J', 'E'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E'], focus: 'Prosign + E/T' },
  { lessonNumber: 6, newChars: ['F', '0', 'Y', ','], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ','], focus: 'Punctuation + digits' },
  { lessonNumber: 7, newChars: ['V', 'G', '5', '/'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',', 'V', 'G', '5', '/'], focus: 'Fraction + slant' },
  { lessonNumber: 8, newChars: ['Q', '9', 'Z', '?'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',', 'V', 'G', '5', '/', 'Q', '9', 'Z', '?'], focus: 'Rare + query' },
  { lessonNumber: 9, newChars: ['H', '3', '8', '@'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',', 'V', 'G', '5', '/', 'Q', '9', 'Z', '?', 'H', '3', '8', '@'], focus: 'Email + time' },
  { lessonNumber: 10, newChars: ['B', '4', '2', '7'], cumulative: ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O', 'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ',', 'V', 'G', '5', '/', 'Q', '9', 'Z', '?', 'H', '3', '8', '@', 'B', '4', '2', '7'], focus: 'Digits complete' },
];
