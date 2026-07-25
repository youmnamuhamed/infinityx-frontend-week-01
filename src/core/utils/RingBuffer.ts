/**
 * RingBuffer<T>
 *
 * Fixed-capacity circular buffer with O(1) push, O(1) duplicate detection,
 * and automatic eviction of the oldest entry once capacity is reached.
 *
 * Designed for high-frequency telemetry streams where:
 *  - We only care about the most recent N events (memory must stay bounded).
 *  - Reconnects / retries can replay events we've already processed, so
 *    incoming events must be deduplicated by `seq_id` before being stored.
 *
 * Every stored item must carry a unique `seq_id`. Two items with the same
 * `seq_id` are considered the same event — the second one is dropped.
 */

export interface RingBufferItem {
  seq_id: string | number;
}

export class RingBuffer<T extends RingBufferItem> {
  private readonly capacity: number;
  private buffer: (T | undefined)[];
  private head: number; // index where the next item will be written
  private count: number; // number of items currently stored (<= capacity)
  private readonly seenIds: Set<string | number>;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("RingBuffer capacity must be a positive integer");
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
    this.head = 0;
    this.count = 0;
    this.seenIds = new Set();
  }

  /**
   * Attempt to add an item to the buffer.
   * Returns `true` if the item was added, `false` if it was a duplicate
   * (by seq_id) and therefore ignored.
   */
  push(item: T): boolean {
    if (this.seenIds.has(item.seq_id)) {
      return false;
    }

    // If the slot we're about to write into already holds an item,
    // that item is being evicted — remove its id from the seen-set too,
    // otherwise seenIds grows without bound and we'd leak memory forever.
    const evicted = this.buffer[this.head];
    if (evicted !== undefined) {
      this.seenIds.delete(evicted.seq_id);
    }

    this.buffer[this.head] = item;
    this.seenIds.add(item.seq_id);
    this.head = (this.head + 1) % this.capacity;
    this.count = Math.min(this.count + 1, this.capacity);

    return true;
  }

  /**
   * Returns whether a given seq_id currently exists in the buffer.
   */
  has(seqId: string | number): boolean {
    return this.seenIds.has(seqId);
  }

  /**
   * Returns all items currently stored, in insertion order
   * (oldest first, newest last). O(capacity).
   */
  toArray(): T[] {
    if (this.count < this.capacity) {
      // Buffer hasn't wrapped yet — items are simply buffer[0..count)
      return this.buffer.slice(0, this.count) as T[];
    }

    // Buffer has wrapped: oldest item is at `head` (about to be overwritten),
    // so read from head -> end, then 0 -> head.
    return [
      ...(this.buffer.slice(this.head) as T[]),
      ...(this.buffer.slice(0, this.head) as T[]),
    ];
  }

  /**
   * Returns the most recently pushed item, or undefined if empty.
   */
  latest(): T | undefined {
    if (this.count === 0) return undefined;
    const lastIndex = (this.head - 1 + this.capacity) % this.capacity;
    return this.buffer[lastIndex];
  }

  /**
   * Returns the last `n` items, newest last (same order as toArray).
   */
  latestN(n: number): T[] {
    const all = this.toArray();
    if (n >= all.length) return all;
    return all.slice(all.length - n);
  }

  size(): number {
    return this.count;
  }

  isFull(): boolean {
    return this.count === this.capacity;
  }

  clear(): void {
    this.buffer = new Array<T | undefined>(this.capacity);
    this.head = 0;
    this.count = 0;
    this.seenIds.clear();
  }
}
