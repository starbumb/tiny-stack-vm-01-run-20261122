// Tiny stack VM (make.fun ISA v1): runs every /input/<id>/program.bin on its input.bin and writes
// /output/<id>/stdout.bin + exit.txt. Semantics mirror the reference VM exactly, trap order included.
// 32-bit wrapping ints, 256-deep stack, 256 words of memory, ten traps with their own exit codes.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// [opcode, immediate bytes, pops, pushes] for the 37 opcodes; IMM -1 marks an unknown opcode.
const SPEC = [
  0x00, 0, 0, 0, 0x01, 1, 0, 1, 0x02, 4, 0, 1, 0x03, 0, 1, 0,
  0x04, 0, 1, 2, 0x05, 0, 2, 2, 0x06, 0, 2, 3, 0x07, 0, 3, 3,
  0x10, 0, 2, 1, 0x11, 0, 2, 1, 0x12, 0, 2, 1, 0x13, 0, 2, 1,
  0x14, 0, 2, 1, 0x15, 0, 2, 1, 0x16, 0, 2, 1, 0x17, 0, 1, 1,
  0x18, 0, 2, 1, 0x19, 0, 2, 1, 0x1a, 0, 2, 1, 0x1b, 0, 1, 1,
  0x1c, 0, 2, 1, 0x1d, 0, 2, 1, 0x1e, 0, 2, 1, 0x20, 0, 2, 1,
  0x21, 0, 2, 1, 0x22, 0, 2, 1, 0x30, 2, 0, 0, 0x31, 2, 1, 0,
  0x32, 2, 1, 0, 0x33, 2, 0, 0, 0x34, 0, 0, 0, 0x40, 0, 1, 1,
  0x41, 0, 2, 0, 0x50, 0, 1, 0, 0x51, 0, 1, 0, 0x52, 0, 0, 1,
  0x53, 0, 1, 0,
];
const IMM = new Int8Array(256).fill(-1);
const POPS = new Uint8Array(256);
const PUSH = new Uint8Array(256);
for (let i = 0; i < SPEC.length; i += 4) {
  IMM[SPEC[i]] = SPEC[i + 1];
  POPS[SPEC[i]] = SPEC[i + 2];
  PUSH[SPEC[i]] = SPEC[i + 3];
}
const enc = new TextEncoder();

function run(P, IN) {
  const n = P.length;
  const D = new Int32Array(256);
  const C = new Int32Array(64);
  const M = new Int32Array(256);
  const out = new Uint8Array(65536);
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0, exit = 0;
  outer: while (true) {
    if (steps === 1000000) { exit = 10; break; }
    if (pc < 0 || pc >= n) { exit = 9; break; }
    const op = P[pc];
    const imm = IMM[op];
    if (imm < 0) { exit = 5; break; }
    if (pc + imm >= n) { exit = 9; break; }
    steps++;
    const next = pc + 1 + imm;
    if (sp < POPS[op]) { exit = 2; break; }
    if (sp - POPS[op] + PUSH[op] > 256) { exit = 3; break; }
    pc = next;
    switch (op) {
      case 0x00: exit = 0; break outer;
      case 0x01: D[sp++] = (P[next - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = P[next - 4] | (P[next - 3] << 8) | (P[next - 2] << 16) | (P[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        let r;
        switch (op) {
          case 0x10: r = (a + b) | 0; break;
          case 0x11: r = (a - b) | 0; break;
          case 0x12: r = Math.imul(a, b); break;
          case 0x13: if (b === 0) { exit = 4; break outer; } r = a === -2147483648 && b === -1 ? a : (a / b) | 0; break;
          case 0x14: if (b === 0) { exit = 4; break outer; } r = b === -1 ? 0 : (a % b) | 0; break;
          case 0x15: if (b === 0) { exit = 4; break outer; } r = Math.floor((a >>> 0) / (b >>> 0)) | 0; break;
          case 0x16: if (b === 0) { exit = 4; break outer; } r = ((a >>> 0) % (b >>> 0)) | 0; break;
          case 0x18: r = a & b; break;
          case 0x19: r = a | b; break;
          case 0x1a: r = a ^ b; break;
          case 0x1c: r = a << (b & 31); break;
          case 0x1d: r = a >> (b & 31); break;
          case 0x1e: r = (a >>> (b & 31)) | 0; break;
          case 0x20: r = a === b ? 1 : 0; break;
          case 0x21: r = a < b ? 1 : 0; break;
          case 0x22: r = (a >>> 0) < (b >>> 0) ? 1 : 0; break;
        }
        D[sp - 2] = r; sp--;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((P[next - 2] | (P[next - 1] << 8)) << 16) >> 16;
        let take = true;
        if (op !== 0x30) { const v = D[--sp]; take = op === 0x31 ? v === 0 : v !== 0; }
        if (take) pc = next + rel;
        break;
      }
      case 0x33:
        if (csp === 64) { exit = 7; break outer; }
        C[csp++] = next;
        pc = P[next - 2] | (P[next - 1] << 8);
        break;
      case 0x34:
        if (csp === 0) { exit = 8; break outer; }
        pc = C[--csp];
        break;
      case 0x40: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) { exit = 6; break outer; }
        D[sp - 1] = M[addr];
        break;
      }
      case 0x41: {
        const addr = D[sp - 1];
        if (addr < 0 || addr >= 256) { exit = 6; break outer; }
        M[addr] = D[sp - 2]; sp -= 2;
        break;
      }
      case 0x50: {
        const bytes = enc.encode(String(D[sp - 1]));
        if (olen + bytes.length > 65536) { exit = 11; break outer; }
        sp--;
        out.set(bytes, olen);
        olen += bytes.length;
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) { exit = 11; break outer; }
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < IN.length ? IN[ip++] : -1; break;
      case 0x53: exit = D[--sp] & 255; break outer;
      default: exit = 5; break outer;
    }
  }
  return { out: out.slice(0, olen), exit };
}

for (const id of readdirSync(I).sort()) {
  let prog, inp;
  try { prog = readFileSync(join(I, id, 'program.bin')); } catch { prog = new Uint8Array(0); }
  try { inp = readFileSync(join(I, id, 'input.bin')); } catch { inp = new Uint8Array(0); }
  const r = run(prog, inp);
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), r.exit + '\n');
}
