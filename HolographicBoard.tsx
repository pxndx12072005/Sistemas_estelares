import { AlertCircle, Check, Eraser, RotateCcw, Trash2, Undo } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { addFrac, formatFrac, makeFrac, mulFrac, parseFracInput } from './fractionUtils';
import { Fraction, SystemProblem } from './types';

interface HolographicBoardProps {
  isOpen: boolean;
  onClose: () => void;
  problem: SystemProblem | null;
}

/** Computes initial matrix for Sector 5 k questions depending on chosen k option */
function computeInitialMatrixForK(problem: SystemProblem, chosenOption: string): Fraction[][] {
  const base = problem.initialMatrix.map((row) => row.map((cell) => ({ ...cell })));
  if (!problem.isKQuestion || !chosenOption) return base;

  // S5-1 & S5-2: x + y = 2 ; 2x + ky = 4
  if (problem.id === 'S5-1' || problem.id === 'S5-2') {
    let kVal = 2;
    if (chosenOption === 'k = 4') kVal = 4;
    else if (chosenOption === 'k = −2' || chosenOption === 'k = -2') kVal = -2;
    else if (chosenOption === 'Ningún valor') kVal = 4; // shows incompatible or different k
    return [
      [makeFrac(1), makeFrac(1), makeFrac(2)],
      [makeFrac(2), makeFrac(kVal), makeFrac(4)],
    ];
  }

  // S5-3: x + ky = 1 ; kx + y = 1
  if (problem.id === 'S5-3') {
    let kVal = -1;
    if (chosenOption === 'k = 1') kVal = 1;
    else if (chosenOption === 'k = 0') kVal = 0;
    return [
      [makeFrac(1), makeFrac(kVal), makeFrac(1)],
      [makeFrac(kVal), makeFrac(1), makeFrac(1)],
    ];
  }

  // S5-5: x + y + z = 1 ; x + 2y + 3z = 2 ; x + 3y + kz = 3
  if (problem.id === 'S5-5') {
    let kVal = 5;
    if (chosenOption === 'k = 3') kVal = 3;
    else if (chosenOption === 'k = 1') kVal = 1;
    return [
      [makeFrac(1), makeFrac(1), makeFrac(1), makeFrac(1)],
      [makeFrac(1), makeFrac(2), makeFrac(3), makeFrac(2)],
      [makeFrac(1), makeFrac(3), makeFrac(kVal), makeFrac(3)],
    ];
  }

  // S5-6: x + y + z = 1 ; x + 2y + 3z = 2 ; x + 3y + kz = 4
  if (problem.id === 'S5-6') {
    let kVal = 5;
    if (chosenOption === 'k = 3') kVal = 3;
    else if (chosenOption === 'k = 1') kVal = 1;
    return [
      [makeFrac(1), makeFrac(1), makeFrac(1), makeFrac(1)],
      [makeFrac(1), makeFrac(2), makeFrac(3), makeFrac(2)],
      [makeFrac(1), makeFrac(3), makeFrac(kVal), makeFrac(4)],
    ];
  }

  return base;
}

export function HolographicBoard({ isOpen, onClose, problem }: HolographicBoardProps) {
  const [activeTab, setActiveTab] = useState<'DRAW' | 'MATRIX'>('DRAW');

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [penColor, setPenColor] = useState<string>('#34E1FF');
  const [penSize, setPenSize] = useState<number>(3);
  const [isEraser, setIsEraser] = useState<boolean>(false);
  const isDrawing = useRef(false);

  // Matrix state
  const [matrix, setMatrix] = useState<Fraction[][]>([]);
  const [history, setHistory] = useState<{ matrix: Fraction[][]; opDesc: string }[]>([]);
  const [opLogs, setOpLogs] = useState<string[]>([]);

  // Form inputs for elementary row operations
  const [opType, setOpType] = useState<'SWAP' | 'SCALE' | 'ADD'>('ADD');
  const [rowI, setRowI] = useState<number>(1);
  const [rowJ, setRowJ] = useState<number>(0);
  const [kInput, setKInput] = useState<string>('-2');
  const [kParamChoice, setKParamChoice] = useState<string>('');
  const [matrixError, setMatrixError] = useState<string>('');

  // Reset matrix whenever problem changes
  useEffect(() => {
    if (problem) {
      let defaultK = '';
      if (problem.isKQuestion && problem.kOptions && problem.kOptions.length > 0) {
        defaultK = problem.kOptions[0];
        setKParamChoice(defaultK);
      }
      const initial = computeInitialMatrixForK(problem, defaultK);
      setMatrix(initial);
      setHistory([]);
      setOpLogs([]);
      setMatrixError('');
      setRowI(problem.numVars > 2 ? 1 : 1);
      setRowJ(0);
      setKInput('-2');
    }
  }, [problem?.id]);

  // Clean drawing canvas when problem changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [problem?.id]);

  // Handler for changing k parameter in Sector 5
  const handleSelectKOption = (opt: string) => {
    if (!problem) return;
    setKParamChoice(opt);
    const newInitial = computeInitialMatrixForK(problem, opt);
    setMatrix(newInitial);
    setHistory([]);
    setOpLogs([`Matriz actualizada con ${opt}`]);
    setMatrixError('');
  };

  // Canvas drawing handlers (strictly isolated pointer events)
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
    isDrawing.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isEraser) {
      ctx.clearRect(x - penSize * 4, y - penSize * 4, penSize * 8, penSize * 8);
    } else {
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.stopPropagation();
    if (isDrawing.current) {
      isDrawing.current = false;
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {
          // safe fallback
        }
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Matrix Row Operations
  const applyRowOperation = () => {
    setMatrixError('');
    if (!matrix.length) return;
    const numRows = matrix.length;
    if (rowI >= numRows || (opType !== 'SCALE' && rowJ >= numRows)) {
      setMatrixError('Fila fuera de rango.');
      return;
    }

    const newMatrix = matrix.map((row) => row.map((cell) => ({ ...cell })));
    let desc = '';

    if (opType === 'SWAP') {
      if (rowI === rowJ) {
        setMatrixError('Selecciona dos filas distintas.');
        return;
      }
      const temp = newMatrix[rowI];
      newMatrix[rowI] = newMatrix[rowJ];
      newMatrix[rowJ] = temp;
      desc = `F${rowI + 1} ↔ F${rowJ + 1}`;
    } else if (opType === 'SCALE') {
      const kFrac = parseFracInput(kInput);
      if (!kFrac || kFrac.n === 0) {
        setMatrixError('El escalar k debe ser distinto de 0 (ej: 2, -1/3).');
        return;
      }
      newMatrix[rowI] = newMatrix[rowI].map((cell) => mulFrac(cell, kFrac));
      desc = `F${rowI + 1} → (${formatFrac(kFrac)})·F${rowI + 1}`;
    } else if (opType === 'ADD') {
      if (rowI === rowJ) {
        setMatrixError('La fila origen y destino no pueden ser la misma.');
        return;
      }
      const kFrac = parseFracInput(kInput);
      if (!kFrac) {
        setMatrixError('Escalar k inválido. Usa enteros o fracciones como -2, 1/2.');
        return;
      }
      const kStr = formatFrac(kFrac);
      const sign = kFrac.n >= 0 ? '+' : '−';
      const absFrac = makeFrac(Math.abs(kFrac.n), kFrac.d);
      const absStr = formatFrac(absFrac);

      newMatrix[rowI] = newMatrix[rowI].map((cell, colIdx) => {
        const added = mulFrac(newMatrix[rowJ][colIdx], kFrac);
        return addFrac(cell, added);
      });

      const term = absStr === '1' ? `F${rowJ + 1}` : `${absStr}·F${rowJ + 1}`;
      desc = `F${rowI + 1} → F${rowI + 1} ${sign} ${term}`;
    }

    setHistory((prev) => [...prev, { matrix, opDesc: desc }]);
    setOpLogs((prev) => [desc, ...prev.slice(0, 7)]);
    setMatrix(newMatrix);
  };

  const undoOperation = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setMatrix(last.matrix);
    setHistory((prev) => prev.slice(0, -1));
    setOpLogs((prev) => prev.slice(1));
    setMatrixError('');
  };

  const resetMatrix = () => {
    if (!problem) return;
    const initial = computeInitialMatrixForK(problem, kParamChoice);
    setMatrix(initial);
    setHistory([]);
    setOpLogs([]);
    setMatrixError('');
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute bottom-0 right-0 w-full lg:w-[48%] h-[68%] lg:h-[85%] bg-slate-950/95 border-2 border-cyan-400/70 rounded-tl-2xl shadow-2xl backdrop-blur-md z-40 flex flex-col overflow-hidden text-slate-100 pointer-events-auto select-none touch-none"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-cyan-500/30">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-bold tracking-wider text-sm flex items-center gap-1.5">
            ✏️ PIZARRA HOLOGRÁFICA
          </span>
          <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setActiveTab('DRAW')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'DRAW'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              DIBUJO
            </button>
            <button
              onClick={() => setActiveTab('MATRIX')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'MATRIX'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              MATRIZ (Gauss)
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded text-xs font-bold"
        >
          CERRAR [P]
        </button>
      </div>

      {/* Equations preview header */}
      {problem && (
        <div className="bg-slate-900/60 px-4 py-1.5 border-b border-slate-800 flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-200">
          <span className="text-slate-400 text-[10px] font-sans">SISTEMA:</span>
          {problem.equations.map((eq, i) => (
            <span key={i} className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
              {eq}
            </span>
          ))}
          {problem.kSubstitutedNote && (
            <span className="text-yellow-300 font-sans font-semibold">
              ({problem.kSubstitutedNote})
            </span>
          )}
        </div>
      )}

      {/* TAB CONTENT: DRAWING */}
      {activeTab === 'DRAW' && (
        <div className="flex-1 flex flex-col p-2 min-h-0">
          {/* Drawing toolbar */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Color:</span>
              {[
                { c: '#FFFFFF', name: 'Blanco' },
                { c: '#34E1FF', name: 'Cian' },
                { c: '#FFC94A', name: 'Amarillo' },
                { c: '#FF3B5C', name: 'Rojo' },
              ].map(({ c, name }) => (
                <button
                  key={c}
                  title={name}
                  onClick={() => {
                    setPenColor(c);
                    setIsEraser(false);
                  }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    penColor === c && !isEraser
                      ? 'scale-110 border-white shadow-md'
                      : 'border-transparent opacity-80'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}

              <div className="h-4 w-px bg-slate-700 mx-1" />

              <span className="text-[10px] text-slate-400">Grosor:</span>
              <button
                onClick={() => {
                  setPenSize(2);
                  setIsEraser(false);
                }}
                className={`px-2 py-0.5 rounded text-xs ${
                  penSize === 2 && !isEraser
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fino
              </button>
              <button
                onClick={() => {
                  setPenSize(5);
                  setIsEraser(false);
                }}
                className={`px-2 py-0.5 rounded text-xs ${
                  penSize === 5 && !isEraser
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Grueso
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                  isEraser
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Eraser size={14} /> Borrador
              </button>
              <button
                onClick={clearCanvas}
                className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 size={14} /> Limpiar
              </button>
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="flex-1 w-full relative mt-2 bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden cursor-crosshair">
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              className="w-full h-full block touch-none"
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: MATRIX GAUSS */}
      {activeTab === 'MATRIX' && (
        <div className="flex-1 flex flex-col p-3 overflow-y-auto space-y-3">
          {/* Sector 5 k options picker */}
          {problem?.isKQuestion && problem.kOptions && problem.kOptions.length > 0 && (
            <div className="bg-slate-900/90 p-2.5 rounded-xl border border-amber-500/40 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold text-amber-300">
                Probar con valor de k:
              </span>
              <div className="flex items-center gap-1.5">
                {problem.kOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSelectKOption(opt)}
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono transition-all ${
                      kParamChoice === opt
                        ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matrix Display */}
          <div className="bg-slate-900/90 p-4 rounded-xl border border-cyan-500/30 flex flex-col items-center shadow-inner">
            <div className="text-[11px] text-slate-400 uppercase tracking-widest mb-2 font-mono">
              Matriz Aumentada [A | b]
            </div>

            <div className="flex items-center gap-1">
              {/* Left bracket */}
              <div className="w-2 self-stretch border-l-2 border-t-2 border-b-2 border-cyan-400 rounded-l" />

              <div className="flex flex-col gap-1.5 py-1">
                {matrix.map((row, rIdx) => (
                  <div key={rIdx} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 w-5 text-right">
                      F{rIdx + 1}
                    </span>
                    {row.map((cell, cIdx) => {
                      const isAugmentedCol = cIdx === row.length - 1;
                      return (
                        <React.Fragment key={cIdx}>
                          {isAugmentedCol && (
                            <div className="w-0.5 h-6 bg-cyan-400/80 mx-1" />
                          )}
                          <div
                            className={`min-w-[48px] h-8 px-2 flex items-center justify-center font-mono font-bold rounded ${
                              cell.n === 0
                                ? 'bg-slate-800/40 text-slate-500'
                                : isAugmentedCol
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-800 text-cyan-200 border border-slate-700'
                            }`}
                          >
                            {formatFrac(cell)}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Right bracket */}
              <div className="w-2 self-stretch border-r-2 border-t-2 border-b-2 border-cyan-400 rounded-r" />
            </div>
          </div>

          {/* Operation Controls */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400">
                Operaciones Elementales
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={undoOperation}
                  disabled={history.length === 0}
                  className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <Undo size={13} /> Deshacer
                </button>
                <button
                  onClick={resetMatrix}
                  className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1"
                >
                  <RotateCcw size={13} /> Reiniciar
                </button>
              </div>
            </div>

            {/* Operation Type Switcher */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOpType('ADD')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                  opType === 'ADD'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Fi → Fi + k·Fj
              </button>
              <button
                onClick={() => setOpType('SCALE')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                  opType === 'SCALE'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Fi → k·Fi
              </button>
              <button
                onClick={() => setOpType('SWAP')}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border ${
                  opType === 'SWAP'
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                    : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                Fi ↔ Fj
              </button>
            </div>

            {/* Inputs based on operation */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="text-slate-400 font-sans">Fila destino:</span>
              <select
                value={rowI}
                onChange={(e) => setRowI(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none"
              >
                {matrix.map((_, idx) => (
                  <option key={idx} value={idx}>
                    F{idx + 1}
                  </option>
                ))}
              </select>

              {opType === 'SWAP' && (
                <>
                  <span className="text-slate-400 font-sans">intercambiar con:</span>
                  <select
                    value={rowJ}
                    onChange={(e) => setRowJ(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none"
                  >
                    {matrix.map((_, idx) => (
                      <option key={idx} value={idx}>
                        F{idx + 1}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {opType === 'SCALE' && (
                <>
                  <span className="text-slate-400 font-sans">multiplicar por k:</span>
                  <input
                    type="text"
                    value={kInput}
                    onChange={(e) => setKInput(e.target.value)}
                    placeholder="ej: -1, 1/2"
                    className="w-20 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold text-center focus:outline-none"
                  />
                </>
              )}

              {opType === 'ADD' && (
                <>
                  <span className="text-slate-400 font-sans">+ (k):</span>
                  <input
                    type="text"
                    value={kInput}
                    onChange={(e) => setKInput(e.target.value)}
                    placeholder="-2, 1/2"
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-amber-300 font-bold text-center focus:outline-none"
                  />
                  <span className="text-slate-400 font-sans">· Fila origen:</span>
                  <select
                    value={rowJ}
                    onChange={(e) => setRowJ(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold focus:outline-none"
                  >
                    {matrix.map((_, idx) => (
                      <option key={idx} value={idx}>
                        F{idx + 1}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <button
                onClick={applyRowOperation}
                className="ml-auto px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-sans text-xs shadow-md transition-all active:scale-95"
              >
                APLICAR
              </button>
            </div>

            {matrixError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-sans">
                <AlertCircle size={14} /> {matrixError}
              </div>
            )}
          </div>

          {/* Operation History Log */}
          {opLogs.length > 0 && (
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono mb-1">
                Historial de Operaciones
              </div>
              <div className="flex flex-wrap gap-1.5">
                {opLogs.map((log, i) => (
                  <span
                    key={i}
                    className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300 border border-slate-700/60"
                  >
                    {log}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
