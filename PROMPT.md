# PROMPT FOR AI

Act as a Principal or Staff Level Node.js and TypeScript Backend Engineer who specializes in high-concurrency systems, distributed databases, event-driven architecture, and Telegram Bot (using Telegraf) performance optimization. I need you to architect and write a robust, production-grade Database module for my Telegraf bot. The system uses Supabase as the primary database (Source of Truth) and syncs to a local JSON file (`database/User.json`) as a continuous backup and local state persistence. I DO NOT want typical AI-generated boilerplate or tutorial-level code. The code must look human-written, highly elegant, highly optimized, with a shortcut, and adhere strictly to elite software engineering principles. Imagine this bot handles 1.000.000 active Telegram groups, bursting at up to 1.000.000.000.000 messages per second during peak hours.

> STRICTLY NOTE: If one or all of these context below is already exist in my repository (Folder), just use that or refactor the code inside to a better compatibility.

Here are the strict architectural requirements and advanced features that MUST be implemented:

### 1. ADVANCED SYNCHRONIZATION, CACHING AND I/O OPTIMIZATION

- **Write-Behind and Read-Through Caching:** All reads MUST execute against an In-Memory LRU Cache (O(1) complexity) to completely bypass network latency. Ensure the cache has a max size limit to prevent Node.js V8 heap OOM (Out of Memory) errors.

- **Batched and Debounced Writes (Queue System):** Never execute direct Supabase or local JSON writes per Telegram message. Implement a background worker/queue that batches mutations and flushes them to Supabase and the local JSON file on a set interval (e.g., every 5 seconds) or when the batch size threshold is met.

- **Atomic File Operations:** For local JSON syncing, use atomic writes. Write the complete state to a `.tmp` file first, then perform `fs.promises.rename`. This guarantees the `User.json` file is NEVER corrupted, truncated, or left empty during sudden server crashes or power loss.

- **Async Mutex / Lock Mechanism:** Implement a robust concurrency control mechanism to ensure that background flushing, local syncing, and cache updates do not race against each other.

- **Streaming for Bootstrapping:** When the bot starts, it must hydrate the cache from the local `User.json` or Supabase. If reading from the local file, use streams or chunked parsing (e.g., `JSONStream`) to avoid blocking the main event loop if the file grows massive.

### 2. RESILIENCE, ERROR HANDLING AND GRACEFUL SHUTDOWN

- **Circuit Breaker and Exponential Backoff:** If Supabase goes down (502, 503, 429 errors, etc), intercept the failure gracefully. DO NOT CRASH THE BOT. Retain the pending mutations in memory or a local fallback queue, and retry with Exponential Backoff + Jitter.

- **Graceful Shutdown Interceptors:** Expose a cleanup method. Trap `SIGINT` and `SIGTERM` process signals to flush all pending in-memory write queues to Supabase and local JSON before the Node process exits into my start.ts

- **Custom Error Hierarchies:** Implement domain-specific Error classes (e.g., `DatabaseConnectionError`, `CacheMissError`, `SchemaValidationError`) to provide deep tracing.

### 3. STRICT TYPESCRIPT, DATA INTEGRITY AND ZOD

- NO `any` or `unknown` used loosely. Rely on strict typings, generics, utility types (like `DeepPartial` for updates), and exhaustive type checking.

- Use `zod` for rigorous runtime schema validation. Data must be validated at the boundary before entering the cache, before syncing to Supabase, and when loading from the local JSON.

- Ensure immutability where appropriate to prevent accidental reference mutations in the memory cache.

### 4. CODE STYLE AND ARCHITECTURE

- No generic AI comments (like "This function writes to database"). Use concise, meaningful JSDoc to explain *why* a complex decision was made (e.g., explaining the complexity of a batching algorithm), not *what* it does.

- Employ a clean facade/orchestrator pattern. The Telegraf bot should only interact with a single `DatabaseManager` class, completely agnostic to whether data is coming from cache, local file, or Supabase.

- Write this for Node >= 24.0.0. Use modern ES Modules, native `crypto`, and top-level await where appropriate.

### 5. THE EXACT SCHEMA

The data structure for a User must exactly match this JSON schema format (example):

```json
{
  "user": [
    {
      "id": 1,
      "telegramID": 123456789,
      "username": "example",
      "first_name": "Im Just Yes You Know",
      "last_name": "Example Yes Im the Example",
      "limit": 10,
      "warning": 0,
      "isOwner": false,
      "isBanned": false,
      "info": {
        "isRegistered": true,
        "dateRegister": "2026-01-02T10:30:00.000Z",
        "snKey": 12345678910,
        "isFollowingCh": true,
        "isNines": {
          "nines": true,
          "expired": "2026-01-02T10:30:40.000Z"
        },
        "isAfk": {
          "afk": true,
          "since": "2026-01-02T10:20:00.000Z",
          "reason": "turuuuuu"
        },
        "languageDefault": "en"
      }
    }
  ]
}
```

And the table i create in Supabase is like this:

```sql
CREATE TABLE users (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  "telegramID" BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  "limit" INT DEFAULT 10,
  warning INT DEFAULT 0,
  "isOwner" BOOLEAN DEFAULT FALSE,
  "isBanned" BOOLEAN DEFAULT FALSE,
  info JSONB DEFAULT '{}'::jsonb
);
```

Please structure your output into these highly decoupled files:

1. types.ts (Zod schemas, inferred types, and utility types)
2. utils/mutex.ts (Async locks to prevent race conditions)
3. utils/queue.ts (Batching and debouncing logic, background workers)
4. errors.ts (Custom error classes)
5. cache.ts (LRU cache implementation with memory protection)
6. local.ts (Atomic local JSON interactions and hydration)
7. supabase.ts (Supabase client, Circuit Breaker, and network ops)
8. database.ts (The master Orchestrator/Facade connecting everything seamlessly for Telegraf)

Provide only the code. Omit conversational filler. Write it exactly like a massive, heavily scrutinized Pull Request submitted by a Principal Engineer.

MAKE IT NO MISTAKE!
