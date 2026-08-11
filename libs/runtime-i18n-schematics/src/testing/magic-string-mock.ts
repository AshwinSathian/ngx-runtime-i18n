// magic-string ships ESM-only (package.json "exports" points solely at
// dist/index.mjs, no CJS build). @angular-devkit/schematics/src/tree/
// recorder.js does `require("magic-string")` unconditionally at module
// load, which is what actually breaks under Jest - not because this
// workspace's schematics exercise MagicString's splicing behavior. Our
// ng-add schematic only calls tree.overwrite(), which HostTree backs with
// its own action-log recorder (host-tree.js), not UpdateRecorderBase/
// magic-string at all. UpdateRecorderBase (the one class here that touches
// magic-string) is only reached via tree.beginUpdate()/commitUpdate(),
// which nothing in this workspace calls.
//
// This is a small but behaviorally faithful reimplementation of exactly the
// four operations recorder.js actually calls (appendLeft, appendRight,
// remove, toString) plus the .original property it reads for bounds
// checking - not a no-op stub - so that entry point stays correct even if
// that assumption ever changes.
interface Chunk {
  start: number;
  end: number;
  left: string;
  right: string;
  removed: boolean;
}

class MagicString {
  readonly original: string;
  private _chunks: Chunk[];

  constructor(text: string) {
    this.original = text;
    this._chunks = [{ start: 0, end: text.length, left: '', right: '', removed: false }];
  }

  private _splitAt(index: number): void {
    for (let i = 0; i < this._chunks.length; i++) {
      const c = this._chunks[i];
      if (index > c.start && index < c.end) {
        const before: Chunk = { start: c.start, end: index, left: c.left, right: '', removed: c.removed };
        const after: Chunk = { start: index, end: c.end, left: '', right: c.right, removed: c.removed };
        this._chunks.splice(i, 1, before, after);
        return;
      }
    }
  }

  private _chunkAt(index: number, side: 'start' | 'end'): Chunk | undefined {
    this._splitAt(index);
    return this._chunks.find((c) => (side === 'start' ? c.start === index : c.end === index));
  }

  appendLeft(index: number, content: string): this {
    const chunk = this._chunks.find((c) => c.end === index) ?? this._chunkAt(index, 'end');
    if (chunk) {
      chunk.left += content;
    }
    return this;
  }

  appendRight(index: number, content: string): this {
    const chunk = this._chunks.find((c) => c.start === index) ?? this._chunkAt(index, 'start');
    if (chunk) {
      chunk.right = content + chunk.right;
    }
    return this;
  }

  remove(start: number, end: number): this {
    this._splitAt(start);
    this._splitAt(end);
    for (const c of this._chunks) {
      if (c.start >= start && c.end <= end) {
        c.removed = true;
      }
    }
    return this;
  }

  toString(): string {
    return this._chunks
      .map((c) => c.left + (c.removed ? '' : this.original.slice(c.start, c.end)) + c.right)
      .join('');
  }
}

export = { MagicString };
