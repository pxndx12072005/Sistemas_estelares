import {
  addFrac,
  divFrac,
  formatFrac,
  makeFrac,
  mulFrac,
  subFrac,
} from './fractionUtils';
import { Fraction, SystemProblem } from './types';

export interface GaussStep {
  matrix: Fraction[][];
  description: string;
}

export interface SystemResolution {
  steps: GaussStep[];
  rankA: number;
  rankAb: number;
  numVars: number;
  solutionType: string;
  finalSolutionText: string;
  trickNote: string;
  kOptionsBreakdown?: { opt: string; note: string }[];
  inconsistentRowIndex?: number;
  freeVarCols?: number[];
  pivotCols?: number[];
}

function cloneMatrix(m: Fraction[][]): Fraction[][] {
  return m.map((row) => row.map((cell) => ({ ...cell })));
}

export function computeGaussResolution(
  problem: SystemProblem,
  substitutedKMatrix?: Fraction[][]
): SystemResolution {
  const numVars = problem.numVars;
  const initial = substitutedKMatrix
    ? cloneMatrix(substitutedKMatrix)
    : cloneMatrix(problem.initialMatrix);

  const steps: GaussStep[] = [
    {
      matrix: cloneMatrix(initial),
      description: 'Matriz aumentada [A | b] inicial',
    },
  ];

  const m = cloneMatrix(initial);
  const numRows = m.length;
  const numCols = m[0].length;
  const varCols = numCols - 1;

  let lead = 0;
  const pivotCols: number[] = [];

  for (let r = 0; r < numRows; r++) {
    if (lead >= varCols) break;

    let pivotRow = r;
    let foundClean = false;
    for (let i = r; i < numRows; i++) {
      if (m[i][lead].n !== 0) {
        if (
          (m[i][lead].n === 1 && m[i][lead].d === 1) ||
          (m[i][lead].n === -1 && m[i][lead].d === 1)
        ) {
          pivotRow = i;
          foundClean = true;
          break;
        }
      }
    }

    if (!foundClean) {
      for (let i = r; i < numRows; i++) {
        if (m[i][lead].n !== 0) {
          pivotRow = i;
          break;
        }
      }
    }

    if (m[pivotRow][lead].n === 0) {
      lead++;
      r--;
      continue;
    }

    if (pivotRow !== r) {
      const temp = m[r];
      m[r] = m[pivotRow];
      m[pivotRow] = temp;
      steps.push({
        matrix: cloneMatrix(m),
        description: `Intercambiar F${r + 1} ↔ F${pivotRow + 1}`,
      });
    }

    const leadVal = m[r][lead];
    if (!(leadVal.n === 1 && leadVal.d === 1)) {
      m[r] = m[r].map((cell) => divFrac(cell, leadVal));
      steps.push({
        matrix: cloneMatrix(m),
        description: `F${r + 1} → (${formatFrac(divFrac(makeFrac(1), leadVal))})·F${r + 1}`,
      });
    }

    pivotCols.push(lead);

    for (let i = r + 1; i < numRows; i++) {
      const factor = m[i][lead];
      if (factor.n !== 0) {
        m[i] = m[i].map((cell, colIdx) => {
          const subtracted = mulFrac(factor, m[r][colIdx]);
          return subFrac(cell, subtracted);
        });
        const sign = factor.n > 0 ? '−' : '+';
        const absVal = makeFrac(Math.abs(factor.n), factor.d);
        const fStr = formatFrac(absVal) === '1' ? '' : `${formatFrac(absVal)}·`;
        steps.push({
          matrix: cloneMatrix(m),
          description: `F${i + 1} → F${i + 1} ${sign} ${fStr}F${r + 1}`,
        });
      }
    }

    lead++;
  }

  let inconsistentRowIndex: number | undefined;
  for (let i = 0; i < numRows; i++) {
    const isZeroA = m[i].slice(0, varCols).every((c) => c.n === 0);
    const nonZeroB = m[i][varCols].n !== 0;
    if (isZeroA && nonZeroB) {
      inconsistentRowIndex = i;
      break;
    }
  }

  if (inconsistentRowIndex === undefined) {
    for (let i = pivotCols.length - 1; i >= 0; i--) {
      const pCol = pivotCols[i];
      const pRow = i;
      for (let j = pRow - 1; j >= 0; j--) {
        const factor = m[j][pCol];
        if (factor.n !== 0) {
          m[j] = m[j].map((cell, colIdx) => subFrac(cell, mulFrac(factor, m[pRow][colIdx])));
        }
      }
    }
  }

  const freeVarCols: number[] = [];
  for (let c = 0; c < varCols; c++) {
    if (!pivotCols.includes(c)) {
      freeVarCols.push(c);
    }
  }

  let finalSolutionText = '';
  const solType = problem.type;

  if (solType === 'NINGUNA' || inconsistentRowIndex !== undefined) {
    finalSolutionText = 'Conjunto solución vacío (∅): la fila 0 = c es imposible.';
  } else if (solType === 'UNICA' || (problem.rankA === numVars && problem.rankA === problem.rankAb)) {
    if (numVars === 2) {
      finalSolutionText = `x = ${formatFrac(m[0][varCols])}, y = ${formatFrac(m[1][varCols])}`;
    } else {
      finalSolutionText = `x = ${formatFrac(m[0][varCols])}, y = ${formatFrac(m[1][varCols])}, z = ${formatFrac(m[2][varCols])}`;
    }
  } else {
    if (numVars === 2) {
      const b0 = formatFrac(m[0][2]);
      const coeffY = m[0][1];
      const signY = coeffY.n > 0 ? '−' : '+';
      const absY = makeFrac(Math.abs(coeffY.n), coeffY.d);
      const absYStr = formatFrac(absY) === '1' ? '' : formatFrac(absY);
      const termY = coeffY.n === 0 ? '' : ` ${signY} ${absYStr}t`;
      finalSolutionText = `x = ${b0}${termY}, y = t, con t ∈ ℝ`;
    } else {
      if (freeVarCols.length <= 1) {
        const b0 = formatFrac(m[0][3]);
        const b1 = formatFrac(m[1][3]);
        const c0z = m[0][2];
        const c1z = m[1][2];

        const sign0 = c0z.n > 0 ? '−' : '+';
        const sign1 = c1z.n > 0 ? '−' : '+';
        const abs0 = makeFrac(Math.abs(c0z.n), c0z.d);
        const abs1 = makeFrac(Math.abs(c1z.n), c1z.d);
        const str0 = formatFrac(abs0) === '1' ? '' : formatFrac(abs0);
        const str1 = formatFrac(abs1) === '1' ? '' : formatFrac(abs1);

        const term0 = c0z.n === 0 ? '' : ` ${sign0} ${str0}t`;
        const term1 = c1z.n === 0 ? '' : ` ${sign1} ${str1}t`;

        finalSolutionText = `x = ${b0}${term0}, y = ${b1}${term1}, z = t, con t ∈ ℝ`;
      } else {
        const b0 = formatFrac(m[0][3]);
        finalSolutionText = `x = ${b0} − y − z, y = s, z = t, con s, t ∈ ℝ`;
      }
    }
  }

  let kOptionsBreakdown: { opt: string; note: string }[] | undefined;
  if (problem.isKQuestion) {
    if (problem.id === 'S5-1') {
      kOptionsBreakdown = [
        { opt: 'k = 2 ✔', note: 'La 2.ª ecuación es el doble de la 1.ª: F2 = 2F1 → INFINITAS soluciones.' },
        { opt: 'k = 4', note: 'det(A) = 4 − 2 = 2 ≠ 0 → Solución ÚNICA.' },
        { opt: 'k = −2', note: 'det(A) = −2 − 2 = −4 ≠ 0 → Solución ÚNICA.' },
      ];
    } else if (problem.id === 'S5-2') {
      kOptionsBreakdown = [
        { opt: 'Ningún valor ✔', note: 'k = 2 da infinitas soluciones y cualquier k ≠ 2 da solución única. Nunca es incompatible porque 4 = 2·2.' },
        { opt: 'k = 2', note: 'Da infinitas soluciones (compatible indeterminado).' },
        { opt: 'k = 4', note: 'det(A) = 2 ≠ 0 → solución única.' },
      ];
    } else if (problem.id === 'S5-3') {
      kOptionsBreakdown = [
        { opt: 'k = −1 ✔', note: 'det = 1 − k² = 0. Con k = −1 queda x − y = 1 y −x + y = 1; sumando da 0 = 2 (incompatible: NINGUNA).' },
        { opt: 'k = 1', note: 'det = 0, pero las dos ecuaciones coinciden x + y = 1 → INFINITAS soluciones.' },
        { opt: 'k = 0', note: 'det = 1 ≠ 0 → Solución ÚNICA.' },
      ];
    } else if (problem.id === 'S5-5') {
      kOptionsBreakdown = [
        { opt: 'k = 5 ✔', note: 'det(A) = k − 5 = 0. Con k = 5, F2 − F1 da y + 2z = 1 y F3 − F2 da y + 2z = 1 (compatibles) → INFINITAS.' },
        { opt: 'k = 3', note: 'det(A) = 3 − 5 = −2 ≠ 0 → Solución ÚNICA.' },
        { opt: 'k = 1', note: 'det(A) = 1 − 5 = −4 ≠ 0 → Solución ÚNICA.' },
      ];
    } else if (problem.id === 'S5-6') {
      kOptionsBreakdown = [
        { opt: 'k = 5 ✔', note: 'Con k = 5, F2 − F1 da y + 2z = 1 pero F3 − F2 da y + 2z = 2 (contradicción 0 = 1) → NINGUNA.' },
        { opt: 'k = 3', note: 'det(A) = −2 ≠ 0 → Solución ÚNICA.' },
        { opt: 'k = 1', note: 'det(A) = −4 ≠ 0 → Solución ÚNICA.' },
      ];
    }
  }

  return {
    steps,
    rankA: problem.rankA,
    rankAb: problem.rankAb,
    numVars,
    solutionType: problem.type,
    finalSolutionText,
    trickNote: problem.explanationNote,
    kOptionsBreakdown,
    inconsistentRowIndex,
    freeVarCols,
    pivotCols,
  };
}
