# TomeCrafter Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: Every unmatched path is denied (`/{document=**}`).
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Strict User Profile Isolation (PII)**: `/users/{userId}` contains PII (`email`). Only the owning user (`request.auth.uid == userId`) or a verified admin may `get`, `create`, `update`, or `delete` their profile. `list` is forbidden on `/users`. Users cannot inject privilege fields (`role`, `isAdmin`).
4. **Book Ownership & Query Enforcement**: `/books/{bookId}` documents must carry `userId == request.auth.uid` on creation. `get`, `update`, and `delete` require `resource.data.userId == request.auth.uid` (or `isAdmin()`). `list` queries strictly require `resource.data.userId == request.auth.uid`.
5. **Immutability & Temporal Integrity**: `id`, `userId`, and `createdAt` are immutable once created. `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on creation and every update.
6. **Admin Isolation**: `/settings/studio` contains `authorizedAdminEmails` and studio branding; only verified admins (via `/admins/{uid}` or bootstrapped verified email `codygermain032@gmail.com`) may read or write `/settings/studio`. `/admins/{adminId}` is never client-writable.
7. **ID Poisoning & Volumetric Bounds**: All document IDs must match `^[a-zA-Z0-9_\-]+$` and be `<= 128` chars. Every string and array field is explicitly size-bounded (including `chapters <= 300`, `mediaLibrary <= 200`, `loreEntries <= 500`).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Book Read**: `GET /books/book-1` with `auth = null` -> `PERMISSION_DENIED`.
2. **Cross-User Book Scrape (`list`)**: `LIST /books` without `where('userId', '==', uid)` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Book Create**: `CREATE /books/book-99` by `userA` with `{ userId: "userB", ... }` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection on User Create**: `CREATE /users/userA` with `{ id: "userA", email: "a@b.com", isAdmin: true, ... }` -> `PERMISSION_DENIED`.
5. **Email Spoofing Admin Bypass**: `WRITE /settings/studio` with `{ email: "codygermain032@gmail.com", email_verified: false }` -> `PERMISSION_DENIED`.
6. **PII Leak via Other User Read**: `GET /users/userB` authenticated as `userA` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery on Book Create**: `CREATE /books/book-10` with client-forged `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Owner Transfer on Update**: `UPDATE /books/book-10` attempting to mutate `userId` or `createdAt` -> `PERMISSION_DENIED`.
9. **ID Poisoning (1.5KB Document ID)**: `CREATE /books/<1500_chars>` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Allowed Update Field**: `UPDATE /books/book-10` setting `title: 12345` (wrong type) or `title: <500_chars>` -> `PERMISSION_DENIED`.
11. **Unbounded Array / Resource Exhaustion**: `CREATE /books/book-10` with `chapters` array length > 300 or `mediaLibrary` array length > 200 -> `PERMISSION_DENIED`.
12. **Privilege Escalation via `/admins` Write**: `CREATE /admins/userA` as `userA` -> `PERMISSION_DENIED`.
