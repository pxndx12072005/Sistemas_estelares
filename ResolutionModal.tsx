import { ChevronLeft, ChevronRight, Eye, Play } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { formatFrac } from './fractionUtils';
import { computeGaussResolution } from './resolutionData';
import { SystemProblem } from './types';

interface ResolutionModalProps {
  isOpen: boolean;
  problem: SystemProblem | null;
  reason: 'FAIL' | 'TIMEOUT' | 'REVIEW';
  userAnswer?: string;
  onSee3D: () => void;
  onContinue: () => void;
}

export function ResolutionModal({
  isOpen,
  problem,
  reason,
  userAnswer,
  onSee3D,
  onContinue,
}: ResolutionModalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const resolution = useMemo(() => {
    if (!problem) return null;
    return computeGaussResolution(problem);
  }, [problem]);

  if (!isOpen || !problem || !resolution) return null;

  const isReview = reason === 'REVIEW';
  // Borde rojo-magenta (#FF3B5C) para fallo o tiempo agotado, dorado (#FFC94A) para revisión de acierto
  const borderColor = isReview ? '#FFC94A' : '#FF3B5C';
  const glowShadow = isReview
    ? '0 0 40px rgba(255, 201, 74, 0.35)'
    : '0 0 40px rgba(255, 59, 92, 0.4)';

  const title =
    reason === 'TIMEOUT'
      ? '⏱ TIEMPO AGOTADO'
      : reason === 'FAIL'
      ? '✖ SALTO FALLIDO'
      : '📖 RESOLUCIÓN DETALLADA';

  const typeColorMap: Record<string, string> = {
    UNICA: '#FFC94A',
    INFINITAS: '#34E1FF',
    NINGUNA: '#FF3B5C',
    'k = 2': '#FFC94A',
    'k = −1': '#34E1FF',
    'k = 5': '#FFC94A',
    'Ningún valor': '#FF3B5C',
  };

  const currentStep = resolution.steps[Math.min(stepIndex, resolution.steps.length - 1)];
  const isLastStep = stepIndex === resolution.steps.length - 1;

  // Rouche-Frobenius justification text
  const n = resolution.numVars;
  const rA = resolution.rankA;
  const rAb = resolution.rankAb;
  let roucheFormula = '';
  if (rA < rAb) {
    roucheFormula = `rango(A) = ${rA}, rango(A|b) = ${rAb}, n = ${n} → rango(A) < rango(A|b): Sistema Incompatible (NINGUNA SOLUCIÓN, al escalonar aparece una fila 0 = c con c ≠ 0)`;
  } else if (rA === rAb && rA === n) {
    roucheFormula = `rango(A) = ${rA}, rango(A|b) = ${rAb}, n = ${n} → rango(A) = rango(A|b) = n: Sistema Compatible Determinado (ÚNICA SOLUCIÓN)`;
  } else {
    roucheFormula = `rango(A) = ${rA}, rango(A|b) = ${rAb}, n = ${n} → rango(A) = rango(A|b) < n: Sistema Compatible Indeterminado (INFINITAS SOLUCIONES, hay ${n - rA} variable(s) libre(s))`;
  }

  return (
    <div
      className="absolute inset-0 bg-slate-950/92 backdrop-blur-md z-50 flex items-center justify-center p-3 md:p-6 text-slate-100 select-none overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/98 rounded-2xl p-4 md:p-6 flex flex-col gap-3 my-auto max-h-[95vh] overflow-y-auto"
        style={{
          border: `2px solid ${borderColor}`,
          boxShadow: glowShadow,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span
              className="text-base md:text-lg font-black tracking-wider"
              style={{ color: borderColor }}
            >
              {title}
            </span>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">
              Sector {problem.sector} · {problem.id}
            </span>
          </div>
          <div className="text-xs font-mono text-cyan-300">
            {problem.equations.join(' ; ')}
          </div>
        </div>

        {/* User Answer vs Correct Answer with their portal colors */}
        {!isReview && (
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-400">Tu respuesta: </span>
              <span
                className="font-bold"
                style={{ color: typeColorMap[userAnswer || ''] || '#FF3B5C' }}
              >
                {userAnswer || 'Sin confirmar'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Respuesta correcta: </span>
              <span
                className="font-bold"
                style={{ color: typeColorMap[problem.type] || '#34E1FF' }}
              >
                {problem.type}
              </span>
            </div>
          </div>
        )}

        {/* Rouché-Frobenius Justification with real numbers */}
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-mono mb-1">
            Justificación con Rangos (Teorema de Rouché–Frobenius):
          </div>
          <div className="font-mono text-cyan-200 font-bold">
            {roucheFormula}
          </div>
        </div>

        {/* Step-by-Step Gaussian Elimination */}
        <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 flex flex-col items-center gap-2">
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] uppercase font-mono text-slate-400 tracking-wider">
              RESOLUCIÓN PASO A PASO (Eliminación de Gauss: {stepIndex + 1}/{resolution.steps.length})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
                disabled={stepIndex === 0}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Paso anterior [◀]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setStepIndex((prev) => Math.min(resolution.steps.length - 1, prev + 1))}
                disabled={stepIndex === resolution.steps.length - 1}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Paso siguiente [▶]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="text-xs font-mono text-amber-300 text-center font-semibold">
            {currentStep.description}
          </div>

          {/* Matrix Visualizer */}
          <div className="flex items-center gap-1 my-1">
            <div className="w-2 self-stretch border-l-2 border-t-2 border-b-2 border-cyan-400 rounded-l" />
            <div className="flex flex-col gap-1 py-1">
              {currentStep.matrix.map((row, rIdx) => {
                const isContradictionRow = isLastStep && resolution.inconsistentRowIndex === rIdx;
                const isZeroRow = isLastStep && row.every((c) => c.n === 0);

                return (
                  <div key={rIdx} className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-right">
                      F{rIdx + 1}
                    </span>
                    {row.map((cell, cIdx) => {
                      const isAugCol = cIdx === row.length - 1;
                      const isPivot =
                        isLastStep &&
                        !isContradictionRow &&
                        resolution.pivotCols?.includes(cIdx) &&
                        rIdx === resolution.pivotCols?.indexOf(cIdx);
                      const isFreeVarCol =
                        isLastStep &&
                        !isAugCol &&
                        resolution.freeVarCols?.includes(cIdx);

                      let cellBg = 'bg-slate-800 text-slate-200 border-slate-700';
                      if (isContradictionRow) {
                        // En rojo la fila 0 0 0 | c (NINGUNA)
                        cellBg = 'bg-rose-950/90 text-rose-300 border-rose-500 font-black shadow-sm';
                      } else if (isZeroRow) {
                        // En gris la fila de ceros (INFINITAS)
                        cellBg = 'bg-slate-900 text-slate-500 border-slate-800';
                      } else if (isPivot) {
                        // En dorado la diagonal de pivotes (ÚNICA)
                        cellBg = 'bg-amber-500/20 text-yellow-300 border-yellow-500/80 font-black shadow-sm';
                      } else if (isFreeVarCol) {
                        // En cian las columnas sin pivote (INFINITAS)
                        cellBg = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/60 font-semibold';
                      } else if (isAugCol) {
                        cellBg = 'bg-slate-800/90 text-amber-300 border-slate-700';
                      }

                      return (
                        <React.Fragment key={cIdx}>
                          {isAugCol && <div className="w-0.5 h-6 bg-cyan-400/80 mx-1" />}
                          <div
                            className={`min-w-[42px] h-7 px-1.5 flex items-center justify-center font-mono text-xs font-bold rounded border ${cellBg}`}
                          >
                            {formatFrac(cell)}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="w-2 self-stretch border-r-2 border-t-2 border-b-2 border-cyan-400 rounded-r" />
          </div>

          {/* Last Step Legend */}
          {isLastStep && (
            <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-slate-400 pt-1">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Pivotes en diagonal (Única)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Columnas sin pivote (Infinitas)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fila contradictoria 0 = c (Ninguna)
              </span>
            </div>
          )}
        </div>

        {/* Solución Final y El Truco */}
        <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-1 text-xs">
          <div className="flex items-start gap-1.5">
            <span className="text-slate-400 font-mono">Solución final:</span>
            <span className="font-mono text-emerald-300 font-bold">
              {resolution.finalSolutionText}
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-slate-300">
            <span className="text-slate-400 font-mono">El truco:</span>
            <span className="text-cyan-200">
              {resolution.trickNote}
            </span>
          </div>

          {/* Parameter k breakdown for Sector 5 */}
          {resolution.kOptionsBreakdown && (
            <div className="mt-1.5 pt-1.5 border-t border-slate-800 space-y-1">
              <span className="text-[10px] text-amber-300 font-bold font-mono uppercase tracking-wider">
                Análisis de las opciones del parámetro k:
              </span>
              {resolution.kOptionsBreakdown.map((item, idx) => (
                <div key={idx} className="text-[11px] font-mono text-slate-300 bg-slate-900/60 p-1 rounded border border-slate-800">
                  • <strong className="text-cyan-300">{item.opt}:</strong> {item.note}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Buttons: VER EN 3D & CONTINUAR */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onSee3D}
            className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Eye size={16} /> VER EN 3D
          </button>
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Play size={16} /> CONTINUAR
          </button>
        </div>
      </div>
    </div>
  );
}
