import { addFrac, divFrac, makeFrac, mulFrac, subFrac } from './fractionUtils';
import { ALL_SYSTEMS } from './systemsData';
import { Fraction, SolutionType, SystemProblem } from './types';

// Determinant of 2x2 matrix
function det2x2(a: number[][]): number {
  return a[0][0] * a[1][1] - a[0][1] * a[1][0];
}

// Determinant of 3x3 matrix
function det3x3(a: number[][]): number {
  return (
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0])
  );
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatEquation(coeffs: number[], b: number, varNames: string[] = ['x', 'y', 'z']): string {
  let res = '';
  let isFirst = true;

  for (let i = 0; i < coeffs.length; i++) {
    const c = coeffs[i];
    if (c === 0) continue;

    const v = varNames[i];
    if (isFirst) {
      if (c === 1) res += `${v}`;
      else if (c === -1) res += `−${v}`;
      else if (c < 0) res += `−${Math.abs(c)}${v}`;
      else res += `${c}${v}`;
      isFirst = false;
    } else {
      if (c === 1) res += ` + ${v}`;
      else if (c === -1) res += ` − ${v}`;
      else if (c < 0) res += ` − ${Math.abs(c)}${v}`;
      else res += ` + ${c}${v}`;
    }
  }

  if (isFirst) res = '0';
  const bStr = b < 0 ? `−${Math.abs(b)}` : `${b}`;
  return `${res} = ${bStr}`;
}

export function computeRanksExact(matrix: Fraction[][]): { rankA: number; rankAb: number } {
  const m = matrix.map((r) => r.map((c) => ({ ...c })));
  const numRows = m.length;
  const numCols = m[0].length;
  const varCols = numCols - 1;

  let lead = 0;
  let rankA = 0;

  for (let r = 0; r < numRows; r++) {
    if (lead >= varCols) break;
    let pivotRow = r;
    while (m[pivotRow][lead].n === 0) {
      pivotRow++;
      if (pivotRow === numRows) {
        pivotRow = r;
        lead++;
        if (lead === varCols) break;
      }
    }
    if (lead === varCols) break;

    const temp = m[r];
    m[r] = m[pivotRow];
    m[pivotRow] = temp;

    const pivotVal = m[r][lead];
    if (pivotVal.n !== 0) {
      m[r] = m[r].map((cell) => divFrac(cell, pivotVal));
      for (let i = 0; i < numRows; i++) {
        if (i !== r) {
          const factor = m[i][lead];
          if (factor.n !== 0) {
            m[i] = m[i].map((cell, colIdx) => subFrac(cell, mulFrac(factor, m[r][colIdx])));
          }
        }
      }
      rankA++;
      lead++;
    }
  }

  // Count non-zero rows for rankAb
  let rankAb = 0;
  for (let r = 0; r < numRows; r++) {
    const isNonZero = m[r].some((c) => c.n !== 0);
    if (isNonZero) rankAb++;
  }

  return { rankA, rankAb };
}

export function verifySystem(
  initialMatrix: Fraction[][],
  numVars: 2 | 3
): { rankA: number; rankAb: number; type: SolutionType } {
  const { rankA, rankAb } = computeRanksExact(initialMatrix);
  let type: SolutionType = 'UNICA';

  if (rankA < rankAb) {
    type = 'NINGUNA';
  } else if (rankA === rankAb && rankA < numVars) {
    type = 'INFINITAS';
  } else if (rankA === rankAb && rankA === numVars) {
    type = 'UNICA';
  }

  return { rankA, rankAb, type };
}

// -------------------------------------------------------------
// SYSTEM GENERATOR ENGINE
// -------------------------------------------------------------
export function generateSystem(
  sector: number,
  targetType: SolutionType,
  existingIds: string[]
): SystemProblem | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const id = `GEN-S${sector}-${Date.now().toString(36)}-${attempt}`;
    if (existingIds.includes(id)) continue;

    if (sector === 1) {
      // 2x2 with integers from -5 to 5, dependent eq is multiple x2 or x3
      const numVars = 2;
      let s = [randInt(-4, 4), randInt(-4, 4)];
      if (targetType === 'UNICA') {
        let A = [
          [randInt(-4, 4), randInt(-4, 4)],
          [randInt(-4, 4), randInt(-4, 4)],
        ];
        A[0][0] = A[0][0] || 1;
        A[0][1] = A[0][1] || 1;
        A[1][0] = A[1][0] || 1;
        A[1][1] = A[1][1] || -1;
        if (det2x2(A) === 0) continue;
        const b = [A[0][0] * s[0] + A[0][1] * s[1], A[1][0] * s[0] + A[1][1] * s[1]];
        const mat = [
          [makeFrac(A[0][0]), makeFrac(A[0][1]), makeFrac(b[0])],
          [makeFrac(A[1][0]), makeFrac(A[1][1]), makeFrac(b[1])],
        ];
        const v = verifySystem(mat, 2);
        if (v.type === 'UNICA') {
          return {
            id,
            sector: 1,
            equations: [formatEquation(A[0], b[0]), formatEquation(A[1], b[1])],
            numVars: 2,
            type: 'UNICA',
            rankA: v.rankA,
            rankAb: v.rankAb,
            solution: s,
            solutionStr: `(${s[0]}, ${s[1]})`,
            explanationNote: `rango(A) = 2, rango(A|b) = 2: rectas secantes en (${s[0]}, ${s[1]}).`,
            initialMatrix: mat,
            planesOrLines: [
              { a: A[0][0], b: A[0][1], c: 0, d: b[0] },
              { a: A[1][0], b: A[1][1], c: 0, d: b[1] },
            ],
          };
        }
      } else {
        // INFINITAS or NINGUNA
        const mult = randChoice([-3, -2, 2, 3]);
        const a1 = randChoice([-3, -2, -1, 1, 2, 3]);
        const b1 = randChoice([-3, -2, -1, 1, 2, 3]);
        const c1 = a1 * s[0] + b1 * s[1];
        const a2 = a1 * mult;
        const b2 = b1 * mult;
        const delta = targetType === 'NINGUNA' ? randChoice([-3, -2, -1, 1, 2, 3]) : 0;
        const c2 = c1 * mult + delta;
        if (Math.abs(a2) > 12 || Math.abs(b2) > 12) continue;

        let rows = [
          { a: a1, b: b1, c: c1, origIdx: 1 },
          { a: a2, b: b2, c: c2, origIdx: 2 },
        ];
        if (Math.random() > 0.5) rows.reverse();

        const mat = rows.map((r) => [makeFrac(r.a), makeFrac(r.b), makeFrac(r.c)]);
        const v = verifySystem(mat, 2);
        if (v.type === targetType) {
          const trick =
            targetType === 'INFINITAS'
              ? `Una ecuación es múltiplo (${mult}) de la otra: representan la misma recta.`
              : `Mismos coeficientes proporcionales (${mult}), pero términos incompatibles (${rows[1].c} ≠ ${mult}·${rows[0].c}).`;
          return {
            id,
            sector: 1,
            equations: rows.map((r) => formatEquation([r.a, r.b], r.c)),
            numVars: 2,
            type: targetType,
            rankA: v.rankA,
            rankAb: v.rankAb,
            explanationNote: trick,
            initialMatrix: mat,
            planesOrLines: rows.map((r) => ({ a: r.a, b: r.b, c: 0, d: r.c })),
          };
        }
      }
    } else if (sector === 2) {
      // 2x2 camouflaged (fractions / decimals / multipliers)
      const multOptions = [-1, 0.5, 1 / 3, 2];
      const multVal = randChoice(multOptions);
      const s = [randInt(-4, 4), randInt(-4, 4)];

      if (targetType === 'UNICA') {
        const A = [
          [randInt(-3, 3) || 1, randInt(-3, 3) || 2],
          [randInt(-3, 3) || 2, randInt(-3, 3) || -1],
        ];
        if (det2x2(A) === 0) continue;
        const b = [A[0][0] * s[0] + A[0][1] * s[1], A[1][0] * s[0] + A[1][1] * s[1]];
        const mat = [
          [makeFrac(A[0][0]), makeFrac(A[0][1]), makeFrac(b[0])],
          [makeFrac(A[1][0]), makeFrac(A[1][1]), makeFrac(b[1])],
        ];
        const v = verifySystem(mat, 2);
        if (v.type === 'UNICA') {
          return {
            id,
            sector: 2,
            equations: [formatEquation(A[0], b[0]), formatEquation(A[1], b[1])],
            numVars: 2,
            type: 'UNICA',
            rankA: 2,
            rankAb: 2,
            solution: s,
            solutionStr: `(${s[0]}, ${s[1]})`,
            explanationNote: `Solución única en (${s[0]}, ${s[1]}).`,
            initialMatrix: mat,
            planesOrLines: [
              { a: A[0][0], b: A[0][1], c: 0, d: b[0] },
              { a: A[1][0], b: A[1][1], c: 0, d: b[1] },
            ],
          };
        }
      } else {
        const a1 = randChoice([-2, -1, 1, 2]);
        const b1 = randChoice([-3, -1, 1, 3]);
        const c1 = a1 * s[0] + b1 * s[1];
        const factor = multVal === 0.5 ? 2 : multVal === 1 / 3 ? 3 : -2;
        const a2 = a1 * factor;
        const b2 = b1 * factor;
        const delta = targetType === 'NINGUNA' ? randChoice([-2, -1, 1, 2]) : 0;
        const c2 = c1 * factor + delta;

        const eq1Str =
          multVal === 0.5
            ? `(1/2)x + (${b1 / 2})y = ${c1 / 2}`
            : formatEquation([a1, b1], c1);
        const eq2Str = formatEquation([a2, b2], c2);

        const mat = [
          [makeFrac(a1), makeFrac(b1), makeFrac(c1)],
          [makeFrac(a2), makeFrac(b2), makeFrac(c2)],
        ];
        const v = verifySystem(mat, 2);
        if (v.type === targetType) {
          return {
            id,
            sector: 2,
            equations: [eq1Str, eq2Str],
            numVars: 2,
            type: targetType,
            rankA: v.rankA,
            rankAb: v.rankAb,
            explanationNote:
              targetType === 'INFINITAS'
                ? `Al multiplicar una ecuación por factor (${factor}) coincide con la otra.`
                : `Los coeficientes son proporcionales (${factor}), pero la constante da contradicción.`,
            initialMatrix: mat,
            planesOrLines: [
              { a: a1, b: b1, c: 0, d: c1 },
              { a: a2, b: b2, c: 0, d: c2 },
            ],
          };
        }
      }
    } else if (sector === 3) {
      // 3x3 standard
      const s = [randInt(-3, 3), randInt(-3, 3), randInt(-3, 3)];
      if (targetType === 'UNICA') {
        const A = [
          [randInt(-2, 3) || 1, randInt(-2, 3) || 1, randInt(-2, 3) || 1],
          [randInt(-2, 3) || 2, randInt(-2, 3) || -1, randInt(-2, 3) || 1],
          [randInt(-2, 3) || 1, randInt(-2, 3) || 2, randInt(-2, 3) || -1],
        ];
        if (det3x3(A) === 0) continue;
        const b = [
          A[0][0] * s[0] + A[0][1] * s[1] + A[0][2] * s[2],
          A[1][0] * s[0] + A[1][1] * s[1] + A[1][2] * s[2],
          A[2][0] * s[0] + A[2][1] * s[1] + A[2][2] * s[2],
        ];
        const mat = [
          [makeFrac(A[0][0]), makeFrac(A[0][1]), makeFrac(A[0][2]), makeFrac(b[0])],
          [makeFrac(A[1][0]), makeFrac(A[1][1]), makeFrac(A[1][2]), makeFrac(b[1])],
          [makeFrac(A[2][0]), makeFrac(A[2][1]), makeFrac(A[2][2]), makeFrac(b[2])],
        ];
        const v = verifySystem(mat, 3);
        if (v.type === 'UNICA') {
          return {
            id,
            sector: 3,
            equations: [
              formatEquation(A[0], b[0]),
              formatEquation(A[1], b[1]),
              formatEquation(A[2], b[2]),
            ],
            numVars: 3,
            type: 'UNICA',
            rankA: 3,
            rankAb: 3,
            solution: s,
            solutionStr: `(${s[0]}, ${s[1]}, ${s[2]})`,
            explanationNote: `rango(A) = 3 y rango(A|b) = 3: solución única (${s[0]}, ${s[1]}, ${s[2]}).`,
            initialMatrix: mat,
            planesOrLines: [
              { a: A[0][0], b: A[0][1], c: A[0][2], d: b[0] },
              { a: A[1][0], b: A[1][1], c: A[1][2], d: b[1] },
              { a: A[2][0], b: A[2][1], c: A[2][2], d: b[2] },
            ],
          };
        }
      } else {
        // INFINITAS or NINGUNA
        const A0 = [randInt(-2, 3) || 1, randInt(-2, 3) || 1, randInt(-2, 3) || 1];
        const A1 = [randInt(-2, 3) || 2, randInt(-2, 3) || -1, randInt(-2, 3) || 0];
        const b0 = A0[0] * s[0] + A0[1] * s[1] + A0[2] * s[2];
        const b1 = A1[0] * s[0] + A1[1] * s[1] + A1[2] * s[2];

        const mult = randChoice([-2, 2, 3]);
        const delta = targetType === 'NINGUNA' ? randChoice([-3, -1, 1, 3]) : 0;
        const A2 = [A0[0] * mult, A0[1] * mult, A0[2] * mult];
        const b2 = b0 * mult + delta;

        let rows = [
          { A: A0, b: b0 },
          { A: A1, b: b1 },
          { A: A2, b: b2 },
        ].sort(() => Math.random() - 0.5);

        const mat = rows.map((r) => [
          makeFrac(r.A[0]),
          makeFrac(r.A[1]),
          makeFrac(r.A[2]),
          makeFrac(r.b),
        ]);
        const v = verifySystem(mat, 3);
        if (v.type === targetType) {
          return {
            id,
            sector: 3,
            equations: rows.map((r) => formatEquation(r.A, r.b)),
            numVars: 3,
            type: targetType,
            rankA: v.rankA,
            rankAb: v.rankAb,
            explanationNote:
              targetType === 'INFINITAS'
                ? `Dos planos son múltiplos: comparten una recta de intersección.`
                : `Planos paralelos incompatibles: contradicción al escalonar.`,
            initialMatrix: mat,
            planesOrLines: rows.map((r) => ({ a: r.A[0], b: r.A[1], c: r.A[2], d: r.b })),
          };
        }
      }
    } else if (sector === 4) {
      // 3x3 with linear combinations (F3 = c1*F1 + c2*F2)
      const s = [randInt(-3, 3), randInt(-3, 3), randInt(-3, 3)];
      const A0 = [randInt(-2, 3) || 1, randInt(-2, 3) || 1, randInt(-2, 3) || 1];
      const A1 = [randInt(-2, 3) || 2, randInt(-2, 3) || -1, randInt(-2, 3) || 2];
      const b0 = A0[0] * s[0] + A0[1] * s[1] + A0[2] * s[2];
      const b1 = A1[0] * s[0] + A1[1] * s[1] + A1[2] * s[2];

      const c1 = randChoice([-2, -1, 1, 2]);
      const c2 = randChoice([-2, -1, 1, 2]);
      const delta = targetType === 'NINGUNA' ? randChoice([-3, -2, -1, 1, 2, 3]) : 0;

      const A2 = [
        c1 * A0[0] + c2 * A1[0],
        c1 * A0[1] + c2 * A1[1],
        c1 * A0[2] + c2 * A1[2],
      ];
      const b2 = c1 * b0 + c2 * b1 + delta;

      if (A2.some((val) => Math.abs(val) > 12)) continue;

      let rows = [
        { A: A0, b: b0, orig: 'F1' },
        { A: A1, b: b1, orig: 'F2' },
        { A: A2, b: b2, orig: 'comb' },
      ];
      // Randomize equation order
      rows.sort(() => Math.random() - 0.5);

      const mat = rows.map((r) => [
        makeFrac(r.A[0]),
        makeFrac(r.A[1]),
        makeFrac(r.A[2]),
        makeFrac(r.b),
      ]);
      const v = verifySystem(mat, 3);
      if (v.type === targetType) {
        const trick =
          targetType === 'INFINITAS'
            ? `Una ecuación es combinación lineal exacta: ${c1 >= 0 ? '+' : ''}${c1}·F1 ${c2 >= 0 ? '+' : ''}${c2}·F2.`
            : `Los coeficientes cumplen ${c1 >= 0 ? '+' : ''}${c1}·F1 ${c2 >= 0 ? '+' : ''}${c2}·F2, pero el término independiente da contradicción.`;

        return {
          id,
          sector: 4,
          equations: rows.map((r) => formatEquation(r.A, r.b)),
          numVars: 3,
          type: targetType,
          rankA: v.rankA,
          rankAb: v.rankAb,
          explanationNote: trick,
          initialMatrix: mat,
          planesOrLines: rows.map((r) => ({ a: r.A[0], b: r.A[1], c: r.A[2], d: r.b })),
        };
      }
    } else if (sector === 6) {
      // Boss: Non-square (2x3 or 3x2) and homogeneous
      const subType = randChoice(['2x3', '3x2', 'homog']);
      const s = [randInt(-2, 2), randInt(-2, 2), randInt(-2, 2)];

      if (subType === '2x3') {
        // 2 equations, 3 unknowns: ALWAYS INFINITAS or NINGUNA
        const A0 = [randInt(-2, 3) || 1, randInt(-2, 3) || 1, randInt(-2, 3) || 1];
        const b0 = A0[0] * s[0] + A0[1] * s[1] + A0[2] * s[2];
        if (targetType === 'NINGUNA') {
          const mult = randChoice([2, -2]);
          const A1 = [A0[0] * mult, A0[1] * mult, A0[2] * mult];
          const b1 = b0 * mult + randChoice([1, -1, 2]);
          const mat = [
            [makeFrac(A0[0]), makeFrac(A0[1]), makeFrac(A0[2]), makeFrac(b0)],
            [makeFrac(A1[0]), makeFrac(A1[1]), makeFrac(A1[2]), makeFrac(b1)],
          ];
          const v = verifySystem(mat, 3);
          if (v.type === 'NINGUNA') {
            return {
              id,
              sector: 6,
              equations: [formatEquation(A0, b0), formatEquation(A1, b1)],
              numVars: 3,
              type: 'NINGUNA',
              rankA: 1,
              rankAb: 2,
              explanationNote: 'Planos paralelos incompatibles: rango(A) = 1 < rango(A|b) = 2.',
              initialMatrix: mat,
              planesOrLines: [
                { a: A0[0], b: A0[0], c: A0[2], d: b0 },
                { a: A1[0], b: A1[0], c: A1[2], d: b1 },
              ],
            };
          }
        } else {
          // INFINITAS
          const A1 = [randInt(-2, 3) || 1, randInt(-2, 3) || -1, randInt(-2, 3) || 2];
          const b1 = A1[0] * s[0] + A1[1] * s[1] + A1[2] * s[2];
          const mat = [
            [makeFrac(A0[0]), makeFrac(A0[1]), makeFrac(A0[2]), makeFrac(b0)],
            [makeFrac(A1[0]), makeFrac(A1[1]), makeFrac(A1[2]), makeFrac(b1)],
          ];
          const v = verifySystem(mat, 3);
          if (v.type === 'INFINITAS') {
            return {
              id,
              sector: 6,
              equations: [formatEquation(A0, b0), formatEquation(A1, b1)],
              numVars: 3,
              type: 'INFINITAS',
              rankA: 2,
              rankAb: 2,
              explanationNote: '2 ecuaciones con 3 incógnitas compatibles: nunca puede ser única (rango ≤ 2 < 3).',
              initialMatrix: mat,
              planesOrLines: [
                { a: A0[0], b: A0[0], c: A0[2], d: b0 },
                { a: A1[0], b: A1[0], c: A1[2], d: b1 },
              ],
            };
          }
        }
      } else if (subType === '3x2') {
        // 3 equations, 2 unknowns
        const s2 = [randInt(-3, 3), randInt(-3, 3)];
        const A0 = [randInt(-2, 3) || 1, randInt(-2, 3) || 1];
        const A1 = [randInt(-2, 3) || 2, randInt(-2, 3) || -1];
        const b0 = A0[0] * s2[0] + A0[1] * s2[1];
        const b1 = A1[0] * s2[0] + A1[1] * s2[1];

        const c1 = randChoice([1, -1, 2]);
        const c2 = randChoice([1, -1, 1]);
        const delta = targetType === 'NINGUNA' ? randChoice([1, -1, 2]) : 0;
        const A2 = [c1 * A0[0] + c2 * A1[0], c1 * A0[1] + c2 * A1[1]];
        const b2 = c1 * b0 + c2 * b1 + delta;

        const rows = [
          { a: A0, b: b0 },
          { a: A1, b: b1 },
          { a: A2, b: b2 },
        ];
        const mat = rows.map((r) => [makeFrac(r.a[0]), makeFrac(r.a[1]), makeFrac(r.b)]);
        const v = verifySystem(mat, 2);
        if (v.type === targetType) {
          return {
            id,
            sector: 6,
            equations: rows.map((r) => formatEquation(r.a, r.b)),
            numVars: 2,
            type: targetType,
            rankA: v.rankA,
            rankAb: v.rankAb,
            solution: targetType === 'UNICA' ? s2 : undefined,
            solutionStr: targetType === 'UNICA' ? `(${s2[0]}, ${s2[1]})` : undefined,
            explanationNote:
              targetType === 'UNICA'
                ? `3 ecuaciones y 2 incógnitas consistentes: única solución (${s2[0]}, ${s2[1]}).`
                : `3 ecuaciones y 2 incógnitas incompatibles: los cruces no coinciden.`,
            initialMatrix: mat,
            planesOrLines: rows.map((r) => ({ a: r.a[0], b: r.a[1], c: 0, d: r.b })),
          };
        }
      } else {
        // Homogeneous (b = 0): NEVER NINGUNA
        if (targetType === 'NINGUNA') continue;
        if (targetType === 'UNICA') {
          const A = [
            [randInt(-2, 3) || 1, randInt(-2, 3) || 1, randInt(-2, 3) || 0],
            [randInt(-2, 3) || 2, randInt(-2, 3) || -1, randInt(-2, 3) || 1],
            [randInt(-2, 3) || 0, randInt(-2, 3) || 2, randInt(-2, 3) || 2],
          ];
          if (det3x3(A) === 0) continue;
          const mat = [
            [makeFrac(A[0][0]), makeFrac(A[0][1]), makeFrac(A[0][2]), makeFrac(0)],
            [makeFrac(A[1][0]), makeFrac(A[1][1]), makeFrac(A[1][2]), makeFrac(0)],
            [makeFrac(A[2][0]), makeFrac(A[2][1]), makeFrac(A[2][2]), makeFrac(0)],
          ];
          const v = verifySystem(mat, 3);
          if (v.type === 'UNICA') {
            return {
              id,
              sector: 6,
              equations: [
                formatEquation(A[0], 0),
                formatEquation(A[1], 0),
                formatEquation(A[2], 0),
              ],
              numVars: 3,
              type: 'UNICA',
              rankA: 3,
              rankAb: 3,
              solution: [0, 0, 0],
              solutionStr: '(0, 0, 0)',
              explanationNote: 'Sistema homogéneo con rango 3 = n: solo la solución trivial (0, 0, 0).',
              initialMatrix: mat,
              planesOrLines: [
                { a: A[0][0], b: A[0][1], c: A[0][2], d: 0 },
                { a: A[1][0], b: A[1][1], c: A[1][2], d: 0 },
                { a: A[2][0], b: A[2][1], c: A[2][2], d: 0 },
              ],
            };
          }
        } else {
          // Homogeneous INFINITAS
          const A0 = [randInt(-2, 3) || 1, randInt(-2, 3) || 2, randInt(-2, 3) || -1];
          const A1 = [randInt(-2, 3) || 2, randInt(-2, 3) || -1, randInt(-2, 3) || 3];
          const A2 = [A0[0] + A1[0], A0[1] + A1[1], A0[2] + A1[2]];
          const mat = [
            [makeFrac(A0[0]), makeFrac(A0[1]), makeFrac(A0[2]), makeFrac(0)],
            [makeFrac(A1[0]), makeFrac(A1[1]), makeFrac(A1[2]), makeFrac(0)],
            [makeFrac(A2[0]), makeFrac(A2[1]), makeFrac(A2[2]), makeFrac(0)],
          ];
          const v = verifySystem(mat, 3);
          if (v.type === 'INFINITAS') {
            return {
              id,
              sector: 6,
              equations: [
                formatEquation(A0, 0),
                formatEquation(A1, 0),
                formatEquation(A2, 0),
              ],
              numVars: 3,
              type: 'INFINITAS',
              rankA: 2,
              rankAb: 2,
              explanationNote: 'Homogéneo con F3 = F1 + F2: infinitas soluciones con 1 variable libre.',
              initialMatrix: mat,
              planesOrLines: [
                { a: A0[0], b: A0[1], c: A0[2], d: 0 },
                { a: A1[0], b: A1[1], c: A1[2], d: 0 },
                { a: A2[0], b: A2[1], c: A2[2], d: 0 },
              ],
            };
          }
        }
      }
    }
  }

  return null;
}

// -------------------------------------------------------------
// SECTOR ROUNDS BUILDER (GENERATED + BANK FALLBACK)
// -------------------------------------------------------------
export function buildSectorRounds(sectorId: number, isClassicMode: boolean): SystemProblem[] {
  const bankProblems = ALL_SYSTEMS.filter((p) => p.sector === sectorId);

  if (isClassicMode) {
    const shuffled = [...bankProblems].sort(() => Math.random() - 0.5);
    const count = sectorId === 6 ? 6 : 5;
    return shuffled.slice(0, count);
  }

  // Generation distribution:
  // Sector 1: 4 generated (2 UNICA, 1 INFINITAS, 1 NINGUNA) + 1 bank
  // Sector 2: 4 generated (2 UNICA, 1 INFINITAS, 1 NINGUNA) + 1 bank
  // Sector 3: 4 generated (3 UNICA, 1 INFINITAS/NINGUNA) + 1 bank
  // Sector 4: 4 generated (equal mix INFINITAS / NINGUNA / trap UNICA) + 1 bank
  // Sector 5: Bank templates randomized (4 generated variations + 1 bank)
  // Sector 6: 5 generated + 1 bank
  let targetTypes: SolutionType[] = [];
  if (sectorId === 1 || sectorId === 2) {
    targetTypes = ['UNICA', 'UNICA', 'INFINITAS', 'NINGUNA'];
  } else if (sectorId === 3) {
    targetTypes = ['UNICA', 'UNICA', 'UNICA', Math.random() > 0.5 ? 'INFINITAS' : 'NINGUNA'];
  } else if (sectorId === 4) {
    targetTypes = ['INFINITAS', 'NINGUNA', 'INFINITAS', Math.random() > 0.5 ? 'NINGUNA' : 'UNICA'];
  } else if (sectorId === 6) {
    targetTypes = ['UNICA', 'INFINITAS', 'NINGUNA', 'INFINITAS', 'UNICA'];
  }

  const generated: SystemProblem[] = [];
  const existingIds: string[] = [];

  for (const t of targetTypes) {
    const gen = generateSystem(sectorId, t, existingIds);
    if (gen) {
      generated.push(gen);
      existingIds.push(gen.id);
    }
  }

  // Fill remainder from bank
  const shuffledBank = [...bankProblems].sort(() => Math.random() - 0.5);
  const neededBankCount = (sectorId === 6 ? 6 : 5) - generated.length;
  const pickedBank = shuffledBank.slice(0, Math.max(1, neededBankCount));

  const total = [...generated, ...pickedBank].sort(() => Math.random() - 0.5);
  return total.slice(0, sectorId === 6 ? 6 : 5);
}
