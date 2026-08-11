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
// that assumption ever changes. Modeled per-boundary-index rather than by
// splitting chunks: every position 0..original.length is a boundary that
// can carry accumulated left-inserted and right-inserted text, read back
// in insertion order (left before right, matching magic-string's own
// left/right-of-a-position semantics) as toString() walks the string once.
class MagicString {
  readonly original: string;
  private _leftInserts = new Map<number, string>();
  private _rightInserts = new Map<number, string>();
  private _removed: Array<[number, number]> = [];

  constructor(text: string) {
    this.original = text;
  }

  appendLeft(index: number, content: string): this {
    this._leftInserts.set(index, (this._leftInserts.get(index) ?? '') + content);
    return this;
  }

  appendRight(index: number, content: string): this {
    this._rightInserts.set(index, content + (this._rightInserts.get(index) ?? ''));
    return this;
  }

  remove(start: number, end: number): this {
    this._removed.push([start, end]);
    return this;
  }

  private _isRemoved(pos: number): boolean {
    return this._removed.some(([start, end]) => pos >= start && pos < end);
  }

  toString(): string {
    let out = '';
    for (let i = 0; i <= this.original.length; i++) {
      out += this._leftInserts.get(i) ?? '';
      out += this._rightInserts.get(i) ?? '';
      if (i < this.original.length && !this._isRemoved(i)) {
        out += this.original[i];
      }
    }
    return out;
  }
}

export { MagicString };
