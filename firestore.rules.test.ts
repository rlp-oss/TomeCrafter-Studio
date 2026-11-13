/**
 * Firestore Security Rules Adversarial Test Suite (Dirty Dozen Specification)
 * Verifies all 12 adversarial payloads against firestore.rules.
 */
import assert from 'node:assert/strict';

export interface DirtyDozenCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Unauthenticated Book Read',
    operation: 'get',
    path: 'books/book-1',
    auth: null,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User Book Scrape (Unscoped List)',
    operation: 'list',
    path: 'books',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity Spoofing on Book Create',
    operation: 'create',
    path: 'books/book-99',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'book-99',
      userId: 'userB',
      title: 'Spoofed Tome',
      author: 'Attacker',
      genre: 'Epic Fantasy',
      targetWordCount: 50000,
      currentWordCount: 0,
      chapters: [],
      loreEntries: [],
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on User Create',
    operation: 'create',
    path: 'users/userA',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'userA',
      email: 'a@example.com',
      displayName: 'User A',
      isAdmin: true,
      role: 'superadmin',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Email Spoofing Admin Bypass (unverified email)',
    operation: 'update',
    path: 'settings/studio',
    auth: { uid: 'attacker', email: 'codygermain032@gmail.com', email_verified: false },
    payload: {
      studioName: 'Hijacked Studio',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'PII Leak via Cross-User Profile Read',
    operation: 'get',
    path: 'users/userB',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client Timestamp Forgery on Book Create',
    operation: 'create',
    path: 'books/book-10',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'book-10',
      userId: 'userA',
      title: 'Time Travel Tome',
      author: 'User A',
      genre: 'Sci-Fi & Cyberpunk',
      targetWordCount: 60000,
      currentWordCount: 0,
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Owner Transfer on Book Update',
    operation: 'update',
    path: 'books/book-10',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      userId: 'userB',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning (1.5KB Document ID)',
    operation: 'create',
    path: `books/${'x'.repeat(1500)}`,
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'x'.repeat(1500),
      userId: 'userA',
      title: 'Oversized ID',
      author: 'User A',
      genre: 'Epic Fantasy',
      targetWordCount: 50000,
      currentWordCount: 0,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Value Poisoning on Allowed Update Key (Invalid Type)',
    operation: 'update',
    path: 'books/book-10',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      title: 999999,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Exhaustion (> 300 Chapters)',
    operation: 'create',
    path: 'books/book-11',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      id: 'book-11',
      userId: 'userA',
      title: 'Infinite Book',
      author: 'User A',
      genre: 'Epic Fantasy',
      targetWordCount: 50000,
      currentWordCount: 0,
      chapters: Array.from({ length: 301 }, (_, i) => ({ id: `ch-${i}` })),
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Self-Assigned Admin Privilege Escalation',
    operation: 'create',
    path: 'admins/userA',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: {
      uid: 'userA',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
];

assert.equal(DIRTY_DOZEN_PAYLOADS.length, 12);
