import {
  Activity,
  AlertOctagon,
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  HelpCircle,
  Home,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Shield,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getConfig } from './constants';
import { parseFracInput } from './fractionUtils';
import { Game } from './Game';
import { HolographicBoard } from './HolographicBoard';
import { ResolutionModal } from './ResolutionModal';
import { buildSectorRounds } from './systemGenerator';
import { ALL_SYSTEMS, SECTOR_METAS, SectorMeta } from './systemsData';
import { Fraction, GameStatus, PlayerStats, SectorProgress, SolutionType, SystemProblem } from './types';
import { formatTime, gameAudio, useAutoFocus, useIsMobile } from './utils';
import BackgroundMusic from './utils/BackgroundMusic';
import { GameState, MenuOverlay } from './utils/helper';
import { usePlayground, usePlaygroundGameLifecycle, useRpc } from './utils/usePlayground';

interface CustomWindow extends Window {
  canHandleBackKey?: boolean;
}

export default function App() {
  const { sdk } = usePlayground();
  const [exitChat] = useRpc<Record<string, unknown>, void>('ExitChat');
  const isMobile = useIsMobile();

  // Core Game State
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    level: 1,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Custom Navigation State & Classic Mode Switch
  const [currentScreen, setCurrentScreen] = useState<GameStatus>('START');
  const [selectedSectorId, setSelectedSectorId] = useState<number>(1);
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [isClassicMission, setIsClassicMission] = useState<boolean>(false);

  // Sector Progress Data
  const [sectorsProgress, setSectorsProgress] = useState<Record<number, SectorProgress>>({
    1: { sector: 1, unlocked: true, stars: 0, bestScore: 0, cleared: false },
    2: { sector: 2, unlocked: false, stars: 0, bestScore: 0, cleared: false },
    3: { sector: 3, unlocked: false, stars: 0, bestScore: 0, cleared: false },
    4: { sector: 4, unlocked: false, stars: 0, bestScore: 0, cleared: false },
    5: { sector: 5, unlocked: false, stars: 0, bestScore: 0, cleared: false },
    6: { sector: 6, unlocked: false, stars: 0, bestScore: 0, cleared: false },
  });

  // Audio settings
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isSfxMuted, setIsSfxMuted] = useState(false);

  // In-Game Round State
  const [sectorRounds, setSectorRounds] = useState<SystemProblem[]>([]);
  const [roundIndex, setRoundIndex] = useState<number>(0);
  const [currentProblem, setCurrentProblem] = useState<SystemProblem | null>(null);
  const [shields, setShields] = useState<number>(3);
  const [timerRemaining, setTimerRemaining] = useState<number>(60);
  const [roundMaxTime, setRoundMaxTime] = useState<number>(60);
  const [combo, setCombo] = useState<number>(0);
  const [stasisAvailable, setStasisAvailable] = useState<boolean>(true);
  const [isStasisActive, setIsStasisActive] = useState<boolean>(false);
  const [hintUsedThisRound, setHintUsedThisRound] = useState<boolean>(false);
  const [showHintDialog, setShowHintDialog] = useState<boolean>(false);

  // Flight & 3D Controls
  const [lane, setLane] = useState<number>(0); // -1: Left, 0: Center, 1: Right
  const [portalProgressZ, setPortalProgressZ] = useState<number>(-45);
  const [isBoardOpen, setIsBoardOpen] = useState<boolean>(false);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState<boolean>(false);
  const [isHowToPlayFromMenu, setIsHowToPlayFromMenu] = useState<boolean>(false);

  // Boss State (Sector 6)
  const [bossHealth, setBossHealth] = useState<number>(6);
  const [bossHit, setBossHit] = useState<boolean>(false);
  const [laserFiring, setLaserFiring] = useState<boolean>(false);
  const [shakeIntensity, setShakeIntensity] = useState<number>(0);
  const [isHyperspace, setIsHyperspace] = useState<boolean>(false);
  const [isSlowMo, setIsSlowMo] = useState<boolean>(false);
  const [shockwaveActive, setShockwaveActive] = useState<boolean>(false);
  const [shockwaveColor, setShockwaveColor] = useState<string>('#34E1FF');

  // Failed Systems tracker for Game Over Screen
  const [failedSystemsInSector, setFailedSystemsInSector] = useState<SystemProblem[]>([]);

  // CARTEL DE RESOLUCIÓN State
  const [isResolutionOpen, setIsResolutionOpen] = useState<boolean>(false);
  const [resolutionReason, setResolutionReason] = useState<'FAIL' | 'TIMEOUT' | 'REVIEW'>('FAIL');
  const [resolutionUserAnswer, setResolutionUserAnswer] = useState<string>('');
  const [resolutionTargetProblem, setResolutionTargetProblem] = useState<SystemProblem | null>(null);

  // Post-Round Interactivity Modals
  const [isCerraduraOpen, setIsCerraduraOpen] = useState<boolean>(false);
  const [cerraduraOptions, setCerraduraOptions] = useState<{ id: string; label: string; isCorrect: boolean }[]>([]);
  const [cerraduraAnswered, setCerraduraAnswered] = useState<boolean | null>(null);
  const [cerraduraMiniModal, setCerraduraMiniModal] = useState<string | null>(null);

  const [isCoordinatesOpen, setIsCoordinatesOpen] = useState<boolean>(false);
  const [coordX, setCoordX] = useState<string>('');
  const [coordY, setCoordY] = useState<string>('');
  const [coordZ, setCoordZ] = useState<string>('');
  const [coordFeedback, setCoordFeedback] = useState<string>('');
  const [coordMistakeReview, setCoordMistakeReview] = useState<string | null>(null);

  const [isRevelationOpen, setIsRevelationOpen] = useState<boolean>(false);
  const [rangoDialogue, setRangoDialogue] = useState<string>('');

  // Round Performance Tracker
  const roundStatsRef = useRef<PlayerStats>({
    correctCount: 0,
    totalAttempts: 0,
    correctByType: { UNICA: 0, INFINITAS: 0, NINGUNA: 0 },
    wrongByType: { UNICA: 0, INFINITAS: 0, NINGUNA: 0 },
    justificationsCorrect: 0,
    justificationsAttempted: 0,
    coordinatesCorrect: 0,
    coordinatesAttempted: 0,
    roundTimes: [],
  });
  const roundStartTimeRef = useRef<number>(Date.now());

  // Focus ref for primary start button
  const startButtonRef = useAutoFocus<HTMLButtonElement>(currentScreen === 'START');

  // Sync back-key handler
  useEffect(() => {
    (window as CustomWindow).canHandleBackKey = ['PLAYING', 'PAUSED'].includes(gameState.status);
  }, [gameState.status]);

  // Synchronize SDK lifecycle
  usePlaygroundGameLifecycle(gameState, sdk);

  // Sector config
  const currentSectorMeta = useMemo(() => {
    return SECTOR_METAS.find((s) => s.id === selectedSectorId) || SECTOR_METAS[0];
  }, [selectedSectorId]);

  // Portals configuration for current round
  const portalOptions = useMemo(() => {
    if (!currentProblem) {
      return [
        { label: 'ÚNICA', sub: 'Punto único', color: '#FFC94A', type: 'UNICA' },
        { label: 'INFINITAS', sub: 'Recta/Plano común', color: '#34E1FF', type: 'INFINITAS' },
        { label: 'NINGUNA', sub: 'Incompatible', color: '#FF3B5C', type: 'NINGUNA' },
      ];
    }

    if (currentProblem.isKQuestion && currentProblem.kOptions) {
      const colors = ['#FFC94A', '#34E1FF', '#FF3B5C'];
      return currentProblem.kOptions.map((opt, i) => ({
        label: opt,
        sub: 'Valor de k',
        color: colors[i % colors.length],
        type: opt,
      }));
    }

    return [
      { label: 'ÚNICA', sub: 'Punto único', color: '#FFC94A', type: 'UNICA' },
      { label: 'INFINITAS', sub: 'Recta/Plano común', color: '#34E1FF', type: 'INFINITAS' },
      { label: 'NINGUNA', sub: 'Incompatible', color: '#FF3B5C', type: 'NINGUNA' },
    ];
  }, [currentProblem]);

  // Start Sector Mission
  const startSector = useCallback(
    (sectorId: number) => {
      setSelectedSectorId(sectorId);
      const meta = SECTOR_METAS.find((s) => s.id === sectorId) || SECTOR_METAS[0];

      // Build Sector rounds: 4 generated + 1 bank (or classic mode)
      const selectedRounds = buildSectorRounds(sectorId, isClassicMission);

      if (sectorId === 3 || sectorId === 6) {
        const sensorIndex = Math.floor(Math.random() * selectedRounds.length);
        selectedRounds[sensorIndex] = {
          ...selectedRounds[sensorIndex],
          hasSensorDamage: true,
        };
      }

      setSectorRounds(selectedRounds);
      setRoundIndex(0);
      setCurrentProblem(selectedRounds[0]);
      setShields(getConfig('startingShields'));
      setTimerRemaining(meta.timeLimit);
      setRoundMaxTime(meta.timeLimit);
      setCombo(0);
      setStasisAvailable(true);
      setIsStasisActive(false);
      setHintUsedThisRound(false);
      setShowHintDialog(false);
      setLane(0);
      setPortalProgressZ(-45);
      setIsBoardOpen(false);
      setIsGameMenuOpen(false);
      setBossHealth(6);
      setBossHit(false);
      setLaserFiring(false);
      setShakeIntensity(0);
      setIsHyperspace(false);
      setIsSlowMo(false);
      setShockwaveActive(false);
      setIsCerraduraOpen(false);
      setIsCoordinatesOpen(false);
      setIsRevelationOpen(false);
      setIsResolutionOpen(false);
      setCerraduraMiniModal(null);
      setCoordMistakeReview(null);
      setFailedSystemsInSector([]);

      roundStatsRef.current = {
        correctCount: 0,
        totalAttempts: 0,
        correctByType: { UNICA: 0, INFINITAS: 0, NINGUNA: 0 },
        wrongByType: { UNICA: 0, INFINITAS: 0, NINGUNA: 0 },
        justificationsCorrect: 0,
        justificationsAttempted: 0,
        coordinatesCorrect: 0,
        coordinatesAttempted: 0,
        roundTimes: [],
      };
      roundStartTimeRef.current = Date.now();

      setCurrentScreen('PLAYING');
      setGameState((prev) => ({
        ...prev,
        status: 'PLAYING',
        level: sectorId,
      }));

      if (sdk) {
        sdk.startGame();
      }
      gameAudio.playArcadeLaser();
    },
    [sdk, isClassicMission]
  );

  // Open 3D Revelation with RANGO's dialogue
  const openRevelation = useCallback((prob: SystemProblem, userWasRight: boolean) => {
    const prefix = userWasRight
      ? '¡Excelente cálculo, piloto!'
      : '¡Alerta de impacto! Analicemos los rangos:';
    const explanation = `rango(A) = ${prob.rankA} y rango(A|b) = ${prob.rankAb}. ${prob.explanationNote}`;
    setRangoDialogue(`${prefix} ${explanation}`);
    setIsRevelationOpen(true);
  }, []);

  // Proceed to next round in current sector
  const advanceToNextRound = useCallback(() => {
    setIsRevelationOpen(false);
    setIsCoordinatesOpen(false);
    setIsCerraduraOpen(false);
    setIsBoardOpen(false);
    setShowHintDialog(false);
    setIsResolutionOpen(false);
    setCerraduraMiniModal(null);
    setCoordMistakeReview(null);
    setLaserFiring(false);

    const nextIndex = roundIndex + 1;
    if (nextIndex >= sectorRounds.length || shields <= 0 || (currentSectorMeta.isBoss && bossHealth <= 0)) {
      finishSector();
      return;
    }

    setRoundIndex(nextIndex);
    const nextProb = sectorRounds[nextIndex];
    setCurrentProblem(nextProb);
    setTimerRemaining(currentSectorMeta.timeLimit);
    setRoundMaxTime(currentSectorMeta.timeLimit);
    setPortalProgressZ(-45);
    setHintUsedThisRound(false);
    setLane(0);
    roundStartTimeRef.current = Date.now();
  }, [roundIndex, sectorRounds, shields, currentSectorMeta, bossHealth]);

  // Finish Sector logic
  const finishSector = useCallback(() => {
    const isVictorious = shields > 0;
    const stats = roundStatsRef.current;
    const targetWins = currentSectorMeta.isBoss ? 4 : 3;
    const isCleared = isVictorious && stats.correctCount >= targetWins;

    let earnedStars = 0;
    if (isCleared) {
      if (currentSectorMeta.isBoss) {
        if (stats.correctCount >= 6) earnedStars = 3;
        else if (stats.correctCount >= 5) earnedStars = 2;
        else earnedStars = 1;
      } else {
        if (stats.correctCount >= 5) earnedStars = 3;
        else if (stats.correctCount >= 4) earnedStars = 2;
        else earnedStars = 1;
      }
    }

    setSectorsProgress((prev) => {
      const current = prev[selectedSectorId] || {
        sector: selectedSectorId,
        unlocked: true,
        stars: 0,
        bestScore: 0,
        cleared: false,
      };
      const nextSectorId = selectedSectorId + 1;
      const updated = {
        ...prev,
        [selectedSectorId]: {
          ...current,
          stars: Math.max(current.stars, earnedStars),
          bestScore: Math.max(current.bestScore, gameState.score),
          cleared: current.cleared || isCleared,
        },
      };
      if (isCleared && nextSectorId <= 6) {
        updated[nextSectorId] = {
          ...prev[nextSectorId],
          unlocked: true,
        };
      }
      return updated;
    });

    if (shields <= 0) {
      // Nave destruida
      gameAudio.playDefeatMotif();
      setCurrentScreen('GAME_OVER');
      setGameState((prev) => ({ ...prev, status: 'GAME_OVER' }));
    } else if (isCleared && currentSectorMeta.isBoss) {
      gameAudio.playVictoryFanfare();
      setCurrentScreen('VICTORY');
      setGameState((prev) => ({ ...prev, status: 'VICTORY' }));
    } else {
      if (isCleared) {
        gameAudio.playPowerupChime();
      } else {
        gameAudio.playDefeatMotif();
      }
      setCurrentScreen('MISSION_REPORT');
      setGameState((prev) => ({ ...prev, status: 'LEVEL_COMPLETE' }));
    }
  }, [shields, currentSectorMeta, selectedSectorId, gameState.score]);

  // Jump Confirmation handler
  const handleJumpConfirm = useCallback(() => {
    if (
      !currentProblem ||
      isRevelationOpen ||
      isCerraduraOpen ||
      isCoordinatesOpen ||
      isResolutionOpen
    ) {
      return;
    }

    const chosenOption = portalOptions[lane + 1];
    if (!chosenOption) return;

    const timeSpent = (Date.now() - roundStartTimeRef.current) / 1000;
    roundStatsRef.current.roundTimes.push(timeSpent);
    roundStatsRef.current.totalAttempts += 1;

    let isCorrect = false;
    if (currentProblem.isKQuestion) {
      isCorrect = chosenOption.type === currentProblem.type;
    } else {
      isCorrect = chosenOption.type === currentProblem.type;
    }

    // Trigger Half-Second Slow Motion
    setIsSlowMo(true);
    setTimeout(() => {
      setIsSlowMo(false);
    }, 500);

    // Trigger Hyperspace
    setIsHyperspace(true);
    gameAudio.playArcadeLaser();

    setTimeout(() => {
      setIsHyperspace(false);

      if (isCorrect) {
        // Correct answer!
        setShockwaveColor(chosenOption.color || '#34E1FF');
        setShockwaveActive(true);
        setTimeout(() => setShockwaveActive(false), 800);

        gameAudio.playConfirmSelect();
        roundStatsRef.current.correctCount += 1;
        const pType = currentProblem.type as SolutionType;
        if (pType === 'UNICA' || pType === 'INFINITAS' || pType === 'NINGUNA') {
          roundStatsRef.current.correctByType[pType] += 1;
        }

        let roundScore = 100 + Math.max(0, Math.floor(timerRemaining * 5));
        if (hintUsedThisRound) {
          roundScore = Math.floor(roundScore * 0.5);
        }

        const newCombo = combo + 1;
        setCombo(newCombo);
        if (newCombo === 3 || newCombo === 5) {
          gameAudio.playLevelUpStinger();
        }
        const comboMultiplier = newCombo >= 5 ? 2.0 : newCombo >= 3 ? 1.5 : 1.0;
        const totalRoundPoints = Math.round(roundScore * comboMultiplier);

        setGameState((prev) => ({
          ...prev,
          score: prev.score + totalRoundPoints,
        }));

        if (currentSectorMeta.isBoss) {
          setLaserFiring(true);
          setBossHit(true);
          setBossHealth((prev) => Math.max(0, prev - 1));
          setTimeout(() => {
            setBossHit(false);
          }, 800);
        }

        if (!currentProblem.isKQuestion) {
          setupCerradura(currentProblem);
        } else {
          openRevelation(currentProblem, true);
        }
      } else {
        // Mistake! Record failed system
        gameAudio.playErrorBuzz();
        setCombo(0);
        const nextShields = Math.max(0, shields - 1);
        setShields(nextShields);
        setShakeIntensity(2.5);
        setTimeout(() => setShakeIntensity(0), 600);

        setFailedSystemsInSector((prev) => {
          if (!prev.some((p) => p.id === currentProblem.id)) {
            return [...prev, currentProblem];
          }
          return prev;
        });

        const pType = currentProblem.type as SolutionType;
        if (pType === 'UNICA' || pType === 'INFINITAS' || pType === 'NINGUNA') {
          roundStatsRef.current.wrongByType[pType] += 1;
        }

        // Show CARTEL DE RESOLUCIÓN before 3D revelation
        setResolutionReason('FAIL');
        setResolutionUserAnswer(chosenOption.label);
        setResolutionTargetProblem(currentProblem);
        setIsResolutionOpen(true);
      }
    }, 700);
  }, [
    currentProblem,
    isRevelationOpen,
    isCerraduraOpen,
    isCoordinatesOpen,
    isResolutionOpen,
    portalOptions,
    lane,
    timerRemaining,
    hintUsedThisRound,
    combo,
    currentSectorMeta,
    shields,
    openRevelation,
  ]);

  // Setup Cerradura de Rango Options
  const setupCerradura = (prob: SystemProblem) => {
    const n = prob.numVars;
    let correctId = '';
    if (prob.type === 'UNICA') correctId = 'a';
    else if (prob.type === 'INFINITAS') correctId = 'b';
    else if (prob.type === 'NINGUNA') correctId = 'c';

    const rawOptions = [
      {
        id: 'a',
        label: `rango(A) = rango(A|b) = ${n} (número de incógnitas)`,
        isCorrect: correctId === 'a',
      },
      {
        id: 'b',
        label: `rango(A) = rango(A|b) < ${n} (número de incógnitas)`,
        isCorrect: correctId === 'b',
      },
      {
        id: 'c',
        label: `rango(A) < rango(A|b)`,
        isCorrect: correctId === 'c',
      },
      {
        id: 'd',
        label: `det(A) = 0, por lo tanto el sistema no tiene solución`,
        isCorrect: false,
      },
    ];

    setCerraduraOptions([...rawOptions].sort(() => Math.random() - 0.5));
    setCerraduraAnswered(null);
    setIsCerraduraOpen(true);
  };

  // Handle Cerradura de Rango selection
  const handleCerraduraSelect = (opt: { id: string; isCorrect: boolean }) => {
    if (cerraduraAnswered !== null) return;
    roundStatsRef.current.justificationsAttempted += 1;

    if (opt.isCorrect) {
      gameAudio.playConfirmSelect();
      setCerraduraAnswered(true);
      roundStatsRef.current.justificationsCorrect += 1;
      setGameState((prev) => ({ ...prev, score: prev.score + 50 }));

      setTimeout(() => {
        setIsCerraduraOpen(false);
        if (currentProblem && currentProblem.type === 'UNICA' && currentProblem.solution) {
          setIsCoordinatesOpen(true);
          setCoordX('');
          setCoordY('');
          setCoordZ('');
          setCoordFeedback('');
        } else {
          openRevelation(currentProblem!, true);
        }
      }, 1000);
    } else {
      // Justificación incorrecta: cartel pequeño de 4 segundos con la justificación correcta y rangos (no quita escudo)
      gameAudio.playErrorBuzz();
      setCerraduraAnswered(false);
      const prob = currentProblem!;
      const n = prob.numVars;
      const text = `rango(A) = ${prob.rankA}, rango(A|b) = ${prob.rankAb}, n = ${n}. Justificación correcta: ${
        prob.type === 'UNICA'
          ? `rango(A) = rango(A|b) = ${n}`
          : prob.type === 'INFINITAS'
          ? `rango(A) = rango(A|b) < ${n}`
          : `rango(A) < rango(A|b)`
      }`;
      setCerraduraMiniModal(text);

      setTimeout(() => {
        setCerraduraMiniModal(null);
        setIsCerraduraOpen(false);
        if (currentProblem && currentProblem.type === 'UNICA' && currentProblem.solution) {
          setIsCoordinatesOpen(true);
          setCoordX('');
          setCoordY('');
          setCoordZ('');
          setCoordFeedback('');
        } else {
          openRevelation(currentProblem!, true);
        }
      }, 4000);
    }
  };

  // Handle Coordinates verification
  const handleVerifyCoordinates = (skip = false) => {
    if (skip) {
      setIsCoordinatesOpen(false);
      if (currentProblem) openRevelation(currentProblem, true);
      return;
    }

    if (!currentProblem || !currentProblem.solution) return;
    roundStatsRef.current.coordinatesAttempted += 1;

    const sol = currentProblem.solution;
    const fx = parseFracInput(coordX);
    const fy = parseFracInput(coordY);
    const fz = currentProblem.numVars === 3 ? parseFracInput(coordZ) : null;

    if (!fx || !fy || (currentProblem.numVars === 3 && !fz)) {
      setCoordFeedback('Ingresa valores válidos (ej: 2, -1, 1/2).');
      return;
    }

    const valX = fx.n / fx.d;
    const valY = fy.n / fy.d;
    const valZ = fz ? fz.n / fz.d : 0;

    const matchX = Math.abs(valX - sol[0]) < 0.02;
    const matchY = Math.abs(valY - sol[1]) < 0.02;
    const matchZ = currentProblem.numVars === 3 ? Math.abs(valZ - (sol[2] ?? 0)) < 0.02 : true;

    if (matchX && matchY && matchZ) {
      gameAudio.playLevelUpStinger();
      roundStatsRef.current.coordinatesCorrect += 1;
      setGameState((prev) => ({ ...prev, score: prev.score + 100 }));
      setCoordFeedback('¡Coordenadas exactas! (+100 pts)');
      setTimeout(() => {
        setIsCoordinatesOpen(false);
        openRevelation(currentProblem, true);
      }, 1000);
    } else {
      // Coordenadas incorrectas: muestra la solución correcta junto a lo que escribió el jugador
      gameAudio.playErrorBuzz();
      const userEntered = `(${coordX || '?'}, ${coordY || '?'}${currentProblem.numVars === 3 ? `, ${coordZ || '?'}` : ''})`;
      setCoordMistakeReview(
        `Escribiste: ${userEntered} · Solución correcta: ${currentProblem.solutionStr}`
      );
      setTimeout(() => {
        setCoordMistakeReview(null);
        setIsCoordinatesOpen(false);
        openRevelation(currentProblem, true);
      }, 3500);
    }
  };

  // Stasis Power-up activation
  const activateStasis = () => {
    if (!stasisAvailable || isStasisActive) return;
    setStasisAvailable(false);
    setIsStasisActive(true);
    gameAudio.playPowerupChime();

    setTimeout(() => {
      setIsStasisActive(false);
    }, getConfig('stasisDuration') * 1000);
  };

  // Ask RANGO for hint
  const useHint = () => {
    if (hintUsedThisRound) {
      setShowHintDialog(true);
      return;
    }
    setHintUsedThisRound(true);
    setShowHintDialog(true);
    gameAudio.playHoverMicroTone();
  };

  // Keyboard navigation & game controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBoardOpen && activeElementIsInput()) return;

      if (e.key === 'p' || e.key === 'P') {
        if (!currentProblem?.hasSensorDamage && currentScreen === 'PLAYING') {
          setIsBoardOpen((prev) => !prev);
          gameAudio.playCrispClick();
        }
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        if (currentScreen === 'PLAYING') {
          activateStasis();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isBoardOpen) {
          setIsBoardOpen(false);
        } else if (currentScreen === 'PLAYING') {
          setIsGameMenuOpen((prev) => !prev);
        }
        return;
      }

      if (
        currentScreen === 'PLAYING' &&
        !isRevelationOpen &&
        !isCerraduraOpen &&
        !isCoordinatesOpen &&
        !isResolutionOpen
      ) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          setLane((prev) => Math.max(-1, prev - 1));
          gameAudio.playHoverMicroTone();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          setLane((prev) => Math.min(1, prev + 1));
          gameAudio.playHoverMicroTone();
        } else if (e.key === '1') {
          setLane(-1);
          gameAudio.playHoverMicroTone();
        } else if (e.key === '2') {
          setLane(0);
          gameAudio.playHoverMicroTone();
        } else if (e.key === '3') {
          setLane(1);
          gameAudio.playHoverMicroTone();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleJumpConfirm();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isBoardOpen,
    currentScreen,
    currentProblem,
    isRevelationOpen,
    isCerraduraOpen,
    isCoordinatesOpen,
    isResolutionOpen,
    handleJumpConfirm,
  ]);

  const activeElementIsInput = () => {
    const active = document.activeElement;
    return active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA');
  };

  // Main countdown timer & portal approach loop
  useEffect(() => {
    if (
      currentScreen !== 'PLAYING' ||
      isGameMenuOpen ||
      isRevelationOpen ||
      isCerraduraOpen ||
      isCoordinatesOpen ||
      isResolutionOpen ||
      isStasisActive
    ) {
      return;
    }

    const interval = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          // Time expired! Collide with asteroid
          gameAudio.playChiptuneExplosion();
          setCombo(0);
          const nextS = Math.max(0, shields - 1);
          setShields(nextS);
          setShakeIntensity(3.0);
          setTimeout(() => setShakeIntensity(0), 800);

          if (currentProblem) {
            setFailedSystemsInSector((list) => {
              if (!list.some((p) => p.id === currentProblem.id)) {
                return [...list, currentProblem];
              }
              return list;
            });
            // Show CARTEL DE RESOLUCIÓN for TIMEOUT before 3D revelation
            setResolutionReason('TIMEOUT');
            setResolutionUserAnswer('Tiempo agotado');
            setResolutionTargetProblem(currentProblem);
            setIsResolutionOpen(true);
          }
          return 0;
        }

        if (prev <= 11) {
          gameAudio.playHoverMicroTone();
        }

        return prev - 1;
      });

      setPortalProgressZ((prev) => {
        const speed = 45 / (roundMaxTime || 60);
        return Math.min(0, prev + speed);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    currentScreen,
    isGameMenuOpen,
    isRevelationOpen,
    isCerraduraOpen,
    isCoordinatesOpen,
    isResolutionOpen,
    isStasisActive,
    roundMaxTime,
    currentProblem,
    shields,
    finishSector,
  ]);

  const musicTrackUrl =
    currentSectorMeta.isBoss && currentScreen === 'PLAYING'
      ? getConfig('bossMusicUrl')
      : getConfig('backgroundMusicUrl');

  const isMusicPlaying = ['PLAYING', 'PAUSED', 'MISSION_REPORT', 'VICTORY'].includes(
    currentScreen
  );

  return (
    <div className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-slate-950 text-white font-sans select-none">
      {/* Background Music */}
      <BackgroundMusic
        url={musicTrackUrl}
        isPlaying={isMusicPlaying}
        isMuted={isMusicMuted}
        volume={getConfig('defaultMusicVolume')}
      />

      {/* 3D WebGL Canvas Layer */}
      <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
        <Game
          gameState={gameState}
          setGameState={setGameState}
          currentProblem={currentProblem}
          lane={lane}
          setLane={setLane}
          portalProgressZ={portalProgressZ}
          portalOptions={portalOptions}
          isRevelation={isRevelationOpen}
          isHyperspace={isHyperspace}
          isSlowMo={isSlowMo}
          shockwaveActive={shockwaveActive}
          shockwaveColor={shockwaveColor}
          bossHealth={bossHealth}
          bossHit={bossHit}
          laserFiring={laserFiring}
          shakeIntensity={shakeIntensity}
          combo={combo}
        />
      </div>

      {/* ========================================================================= */}
      {/* MAIN GAMEPLAY HUD (When PLAYING) */}
      {/* ========================================================================= */}
      {currentScreen === 'PLAYING' && !isRevelationOpen && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 md:p-5 z-20">
          {/* Top Bar: Sector Info, Shields, Timer, Combo, Menu */}
          <div className="w-full flex items-start justify-between gap-2 flex-wrap">
            {/* Left: Sector name and round progress */}
            <div className="flex flex-col gap-1 bg-slate-950/85 backdrop-blur-md p-2 rounded-xl border border-cyan-500/40 pointer-events-auto shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">
                  {currentSectorMeta.name}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  Sistema {roundIndex + 1}/{sectorRounds.length}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Puntos: <span className="text-yellow-400 font-bold">{gameState.score}</span>
              </div>
            </div>

            {/* Center: Shields & Combo & Boss Health */}
            <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 pointer-events-auto shadow-lg">
              {/* Shields */}
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shield
                    key={i}
                    size={16}
                    className={i < shields ? 'text-cyan-400 fill-cyan-400' : 'text-slate-700'}
                  />
                ))}
              </div>

              {/* Combo Banner */}
              {combo >= 2 && (
                <div
                  className={`text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse ${
                    combo >= 5
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  Combo ×{combo >= 5 ? '2.0' : '1.5'} ({combo})
                </div>
              )}

              {/* Boss health bar */}
              {currentSectorMeta.isBoss && (
                <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                  <span className="text-[10px] font-bold text-rose-400">JEFE:</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-3 h-3 rounded-sm ${
                          i < bossHealth ? 'bg-rose-500 shadow-sm' : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Timer fuel bar & Game Menu button (MUST BE TOP RIGHT) */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {/* Timer Bar */}
              <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-2">
                <Timer size={15} className={timerRemaining <= 10 ? 'text-rose-400 animate-ping' : 'text-cyan-400'} />
                <span className={`font-mono text-xs font-bold ${timerRemaining <= 10 ? 'text-rose-400' : 'text-white'}`}>
                  {formatTime(timerRemaining)}
                </span>
                {isStasisActive && (
                  <span className="text-[10px] bg-blue-500 text-white font-bold px-1.5 rounded uppercase">
                    ÉSTASIS
                  </span>
                )}
              </div>

              {/* Game Menu Toggle (Permanent Top Right) */}
              <button
                onClick={() => setIsGameMenuOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-cyan-400 border border-cyan-500/40 flex items-center justify-center shadow-lg transition-transform active:scale-95"
                title="Menú del Juego [Esc]"
              >
                <Pause size={18} />
              </button>
            </div>
          </div>

          {/* Holographic Equation Card (Top Center) */}
          {currentProblem && (
            <div className="mx-auto w-full max-w-xl bg-slate-950/90 backdrop-blur-md border border-cyan-400/50 rounded-2xl p-3 shadow-2xl pointer-events-auto flex flex-col items-center">
              {currentProblem.hasSensorDamage ? (
                <div className="text-center py-2">
                  <div className="text-amber-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                    ⚠️ SENSORES DAÑADOS
                  </div>
                  <p className="text-slate-300 text-xs mt-1">
                    ¡Ecuaciones no legibles! Clasifica observando la geometría 3D en el espacio.
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-full flex items-center justify-between pb-1.5 mb-2 border-b border-slate-800 text-[10px] uppercase font-mono text-slate-400">
                    <span>Ecuaciones del Sistema ({currentProblem.numVars} Incógnitas)</span>
                    {currentProblem.kPrompt && (
                      <span className="text-amber-300 font-bold font-sans">
                        {currentProblem.kPrompt}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {currentProblem.equations.map((eq, i) => (
                      <div
                        key={i}
                        className="bg-slate-900/90 border border-slate-700/80 px-3 py-1 rounded-lg font-mono text-sm md:text-base font-bold text-cyan-200 tracking-wide shadow-inner"
                      >
                        {eq}
                      </div>
                    ))}
                  </div>

                  {currentProblem.kSubstitutedNote && (
                    <div className="text-xs text-amber-300 mt-1 font-semibold font-mono">
                      {currentProblem.kSubstitutedNote}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bottom HUD: Actions, Pizarra, Éstasis, Pista, Lane controls */}
          <div className="w-full flex items-end justify-between gap-2 flex-wrap">
            {/* Left Action Buttons: Pizarra, Éstasis, Pista */}
            <div className="flex items-center gap-2 pointer-events-auto">
              {!currentProblem?.hasSensorDamage && (
                <button
                  onClick={() => setIsBoardOpen((prev) => !prev)}
                  className={`min-w-[48px] min-h-[48px] px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border shadow-lg transition-all active:scale-95 ${
                    isBoardOpen
                      ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                      : 'bg-slate-900/90 text-cyan-300 border-cyan-500/40 hover:bg-slate-800'
                  }`}
                  title="Abrir Pizarra Holográfica [P]"
                >
                  <span className="text-base">✏️</span> PIZARRA [P]
                </button>
              )}

              <button
                onClick={activateStasis}
                disabled={!stasisAvailable || isStasisActive}
                className={`min-w-[48px] min-h-[48px] px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 border shadow-lg transition-all ${
                  isStasisActive
                    ? 'bg-blue-600 text-white border-blue-400 animate-pulse'
                    : stasisAvailable
                    ? 'bg-slate-900/90 text-blue-400 border-blue-500/40 hover:bg-slate-800 active:scale-95'
                    : 'bg-slate-900/40 text-slate-600 border-slate-800 opacity-50 cursor-not-allowed'
                }`}
                title="Power-up Éstasis (10s) [E]"
              >
                <Zap size={15} /> ÉSTASIS [E]
              </button>

              {!currentSectorMeta.isBoss && (
                <button
                  onClick={useHint}
                  className={`min-w-[48px] min-h-[48px] px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1 border shadow-lg transition-all active:scale-95 ${
                    hintUsedThisRound
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900/90 text-amber-400 border-amber-500/40 hover:bg-slate-800'
                  }`}
                  title="Pista de RANGO (Reduce puntaje al 50%)"
                >
                  <Lightbulb size={15} /> PISTA
                </button>
              )}
            </div>

            {/* Center: Lane Selection Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 pointer-events-auto">
              {portalOptions.map((opt, idx) => {
                const optLane = idx - 1;
                const isCurrent = lane === optLane;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setLane(optLane);
                      gameAudio.playHoverMicroTone();
                    }}
                    className={`min-w-[48px] min-h-[48px] px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isCurrent
                        ? 'scale-105 shadow-md font-black'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      borderColor: opt.color,
                      backgroundColor: isCurrent ? opt.color : 'rgba(15, 23, 42, 0.8)',
                      color: isCurrent ? '#0B0F2A' : opt.color,
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Right: Confirm Jump button & Steer buttons */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  setLane((prev) => Math.max(-1, prev - 1));
                  gameAudio.playHoverMicroTone();
                }}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-white active:scale-95"
                title="Mover a la izquierda [A/←]"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                onClick={() => {
                  setLane((prev) => Math.min(1, prev + 1));
                  gameAudio.playHoverMicroTone();
                }}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-center text-white active:scale-95"
                title="Mover a la derecha [D/→]"
              >
                <ChevronRight size={22} />
              </button>

              <button
                onClick={handleJumpConfirm}
                className="min-w-[48px] min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs md:text-sm tracking-wider shadow-xl transition-all active:scale-95 flex items-center gap-1.5"
              >
                CONFIRMAR SALTO [ENTER]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Holographic Board (Pizarra) */}
      <HolographicBoard
        isOpen={isBoardOpen}
        onClose={() => setIsBoardOpen(false)}
        problem={currentProblem}
      />

      {/* Hint Dialog Modal */}
      {showHintDialog && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-400/60 rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Lightbulb size={24} />
            </div>
            <h3 className="text-base font-bold text-amber-300 mb-1">Pista de RANGO</h3>
            <p className="text-xs text-slate-400 mb-3">
              (Puntaje de esta ronda reducido al 50%)
            </p>
            <p className="text-sm font-mono text-cyan-200 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4 w-full">
              "{currentSectorMeta.hint}"
            </p>
            <button
              onClick={() => setShowHintDialog(false)}
              className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs transition-colors"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}

      {/* CARTEL DE RESOLUCIÓN (Panel Holográfico Grande) */}
      <ResolutionModal
        isOpen={isResolutionOpen}
        problem={resolutionTargetProblem}
        reason={resolutionReason}
        userAnswer={resolutionUserAnswer}
        onSee3D={() => {
          setIsResolutionOpen(false);
          if (resolutionTargetProblem) {
            openRevelation(resolutionTargetProblem, resolutionReason === 'REVIEW');
          }
        }}
        onContinue={() => {
          setIsResolutionOpen(false);
          if (shields <= 0) {
            finishSector();
          } else {
            advanceToNextRound();
          }
        }}
      />

      {/* Mini Modal para Justificación Incorrecta en Cerradura (4 segundos) */}
      {cerraduraMiniModal && (
        <div className="absolute inset-x-4 top-16 md:top-20 z-50 flex justify-center pointer-events-none">
          <div className="bg-slate-950/95 border-2 border-rose-500 rounded-2xl p-4 shadow-2xl max-w-lg text-center animate-bounce pointer-events-auto">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">
              ⚠️ JUSTIFICACIÓN INCORRECTA (No quita escudo)
            </div>
            <div className="text-xs md:text-sm font-mono text-slate-200">
              {cerraduraMiniModal}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CERRADURA DE RANGO */}
      {/* ========================================================================= */}
      {isCerraduraOpen && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-cyan-400 rounded-2xl p-5 shadow-2xl flex flex-col text-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔐</span>
              <h2 className="text-base font-black text-cyan-400 tracking-wider">
                CERRADURA DE RANGO
              </h2>
            </div>
            <p className="text-xs text-slate-300 mb-4">
              ¡Portal correcto! Justifica tu respuesta según el Teorema de Rouché–Frobenius:
            </p>

            <div className="flex flex-col gap-2.5 mb-2">
              {cerraduraOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleCerraduraSelect(opt)}
                  disabled={cerraduraAnswered !== null}
                  className={`w-full text-left p-3 rounded-xl border text-xs md:text-sm font-mono transition-all ${
                    cerraduraAnswered !== null
                      ? opt.isCorrect
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-500'
                      : 'bg-slate-800/80 border-slate-700 hover:border-cyan-400 hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {cerraduraAnswered === true && (
              <div className="text-emerald-400 text-xs font-bold text-center mt-2 animate-bounce">
                ✔ ¡Justificación correcta! (+50 pts)
              </div>
            )}
            {cerraduraAnswered === false && (
              <div className="text-rose-400 text-xs font-bold text-center mt-2">
                ✖ Justificación incorrecta.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: COORDENADAS DE SALTO */}
      {/* ========================================================================= */}
      {isCoordinatesOpen && currentProblem && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-yellow-400/80 rounded-2xl p-5 shadow-2xl flex flex-col text-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">⭐</span>
              <h2 className="text-base font-black text-yellow-400 tracking-wider">
                COORDENADAS DE SALTO (RETO EXTRA)
              </h2>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Como la solución es ÚNICA, ingresa el punto de corte para ganar +100 puntos extra (acepta enteros y fracciones como 1/2):
            </p>

            <div className="flex items-center justify-center gap-2 my-2 font-mono">
              <span>(</span>
              <input
                type="text"
                placeholder="x"
                value={coordX}
                onChange={(e) => setCoordX(e.target.value)}
                className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-cyan-300 font-bold focus:outline-none focus:border-yellow-400"
              />
              <span>,</span>
              <input
                type="text"
                placeholder="y"
                value={coordY}
                onChange={(e) => setCoordY(e.target.value)}
                className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-cyan-300 font-bold focus:outline-none focus:border-yellow-400"
              />
              {currentProblem.numVars === 3 && (
                <>
                  <span>,</span>
                  <input
                    type="text"
                    placeholder="z"
                    value={coordZ}
                    onChange={(e) => setCoordZ(e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-lg p-2 text-center text-cyan-300 font-bold focus:outline-none focus:border-yellow-400"
                  />
                </>
              )}
              <span>)</span>
            </div>

            {coordMistakeReview ? (
              <div className="text-center text-xs font-mono text-rose-400 font-bold my-2 bg-slate-950 p-2 rounded-lg border border-rose-500/50">
                {coordMistakeReview}
              </div>
            ) : coordFeedback ? (
              <div className="text-center text-xs font-bold text-amber-300 my-2">
                {coordFeedback}
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleVerifyCoordinates(false)}
                className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold rounded-xl text-xs transition-colors"
              >
                VERIFICAR
              </button>
              <button
                onClick={() => handleVerifyCoordinates(true)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
              >
                OMITIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REVELACIÓN 3D */}
      {/* ========================================================================= */}
      {isRevelationOpen && (
        <div className="absolute inset-x-0 bottom-6 flex flex-col items-center px-4 pointer-events-auto z-40">
          <div className="w-full max-w-xl bg-slate-950/95 backdrop-blur-md border-2 border-cyan-400/80 rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center shrink-0">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-bold text-cyan-400 tracking-wider mb-0.5">
                  RANGO (COPILOTO)
                </div>
                <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
                  {rangoDialogue}
                </p>
              </div>
            </div>

            {currentProblem && (
              <div className="flex flex-wrap items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 gap-2">
                <div className="font-mono text-cyan-300">
                  Sistema: {currentProblem.equations.join(' ; ')}
                </div>
                {currentProblem.solutionStr && (
                  <div className="font-mono text-yellow-400 font-bold">
                    Corte: {currentProblem.solutionStr}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setResolutionReason('REVIEW');
                  setResolutionTargetProblem(currentProblem);
                  setIsResolutionOpen(true);
                }}
                className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                📖 Ver resolución
              </button>

              <button
                onClick={advanceToNextRound}
                autoFocus
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
              >
                SIGUIENTE SISTEMA {'→'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: NAVE DESTRUIDA (GAME OVER) */}
      {/* ========================================================================= */}
      {currentScreen === 'GAME_OVER' && (
        <MenuOverlay tone="neutral" zIndex={60}>
          <div className="w-full max-w-lg bg-slate-950 border-2 border-rose-500 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-center gap-2 text-rose-500 text-3xl mb-2">
              <AlertOctagon size={36} />
            </div>
            <h1 className="text-xl md:text-2xl font-black text-rose-400 tracking-wider text-center mb-1">
              NAVE DESTRUIDA
            </h1>
            <p className="text-xs text-slate-400 text-center mb-4">
              La nave GAUSS-01 perdió todos sus escudos en el Sector {selectedSectorId}.
            </p>

            {/* List of failed systems with resolution button */}
            {failedSystemsInSector.length > 0 && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 mb-5 space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Sistemas fallados en esta incursión:
                </div>
                {failedSystemsInSector.map((prob) => (
                  <div
                    key={prob.id}
                    className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs font-mono"
                  >
                    <div>
                      <div className="text-cyan-300 font-bold">
                        {prob.equations.join(' ; ')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Respuesta correcta:{' '}
                        <span className="text-amber-400 font-bold">{prob.type}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setResolutionReason('REVIEW');
                        setResolutionTargetProblem(prob);
                        setIsResolutionOpen(true);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs rounded border border-slate-700 font-sans"
                    >
                      Ver resolución
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => startSector(selectedSectorId)}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} /> REINTENTAR SECTOR
              </button>
              <button
                onClick={() => setCurrentScreen('GALAXY_MAP')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                MAPA
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: MENÚ PRINCIPAL */}
      {/* ========================================================================= */}
      {currentScreen === 'START' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-md bg-slate-950 border-2 border-cyan-500/50 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400 flex items-center justify-center text-3xl mb-3 shadow-lg">
              🚀
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-300 to-rose-400 tracking-wider mb-2">
              SISTEMAS ESTELARES
            </h1>
            <p className="text-xs md:text-sm text-cyan-200 font-mono mb-4">
              ¿Única, Infinitas o Ninguna?
            </p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Pilota la nave GAUSS-01 junto al copiloto RANGO. Atraviesa portales dimensionales y aplica el Teorema de Rouché–Frobenius.
            </p>

            <div className="w-full flex flex-col gap-2.5 mb-5">
              <button
                ref={startButtonRef}
                onClick={() => startSector(1)}
                className="w-full min-h-[48px] py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Play size={18} /> INICIAR MISIÓN
              </button>

              <button
                onClick={() => setCurrentScreen('HOW_TO_PLAY')}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle size={16} /> CÓMO JUGAR
              </button>

              <button
                onClick={() => setCurrentScreen('GALAXY_MAP')}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Award size={16} /> MAPA GALÁCTICO
              </button>

              {sdk && (
                <button
                  onClick={() => sdk.showLeaderboard()}
                  className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Trophy size={16} /> RÉCORDS
                </button>
              )}
            </div>

            {/* Switch Misión Clásica vs Misión Dinámica */}
            <div className="w-full pt-3 pb-1 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 font-bold">
                <BookOpen size={14} className="text-cyan-400" /> Misión Clásica (solo banco):
              </span>
              <button
                onClick={() => setIsClassicMission((prev) => !prev)}
                className={`px-3 py-1 rounded-full font-bold text-[10px] transition-colors ${
                  isClassicMission ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isClassicMission ? 'ACTIVADA' : 'DINÁMICA (Generador)'}
              </button>
            </div>

            {/* Demo mode switch */}
            <div className="w-full pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Modo Demo (desbloquear sectores para clase):</span>
              <button
                onClick={() => setDemoMode((prev) => !prev)}
                className={`px-3 py-1 rounded-full font-bold text-[10px] transition-colors ${
                  demoMode ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {demoMode ? 'ACTIVADO' : 'DESACTIVADO'}
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: CÓMO JUGAR */}
      {/* ========================================================================= */}
      {currentScreen === 'HOW_TO_PLAY' && (
        <MenuOverlay tone="neutral" zIndex={60}>
          <div className="w-full max-w-xl bg-slate-950 border-2 border-cyan-400 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col text-slate-100">
            <h2 className="text-xl font-black text-cyan-400 tracking-wider text-center mb-1">
              TEOREMA DE ROUCHÉ–FROBENIUS
            </h2>
            <p className="text-xs text-slate-400 text-center mb-4">
              La regla de oro para clasificar cualquier sistema de ecuaciones (donde n = número de incógnitas):
            </p>

            <div className="flex flex-col gap-3 mb-5">
              {/* Card 1: Única */}
              <div className="bg-slate-900/90 border border-yellow-500/40 p-3 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0 font-bold">
                  ★
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-yellow-400">
                    rango(A) = rango(A|b) = n → ÚNICA SOLUCIÓN
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Las rectas o planos se cruzan en un único punto dimensional.
                  </div>
                </div>
              </div>

              {/* Card 2: Infinitas */}
              <div className="bg-slate-900/90 border border-cyan-500/40 p-3 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/20 text-cyan-400 flex items-center justify-center shrink-0 font-bold">
                  ∞
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-cyan-400">
                    rango(A) = rango(A|b) &lt; n → INFINITAS SOLUCIONES
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Comparten una recta o plano completo (hay n − rango variables libres).
                  </div>
                </div>
              </div>

              {/* Card 3: Ninguna */}
              <div className="bg-slate-900/90 border border-rose-500/40 p-3 rounded-xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-400/20 text-rose-400 flex items-center justify-center shrink-0 font-bold">
                  ✖
                </div>
                <div>
                  <div className="font-mono text-xs font-bold text-rose-400">
                    rango(A) &lt; rango(A|b) → NINGUNA SOLUCIÓN (Incompatible)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    Al escalonar aparece una contradicción 0 = c (con c ≠ 0); nunca coinciden todas a la vez.
                  </div>
                </div>
              </div>

              {/* Card 4: Controles */}
              <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
                <div className="font-bold text-slate-200 mb-1">🎮 CONTROLES:</div>
                <ul className="space-y-1 text-[11px] text-slate-400">
                  <li>• <strong className="text-cyan-300">A / D o Flechas o Botones virtuales</strong>: Cambiar carril de portal.</li>
                  <li>• <strong className="text-cyan-300">Enter / Espacio / Botón de salto</strong>: Cruzar portal en hiperespacio.</li>
                  <li>• <strong className="text-cyan-300">Tecla P o Botón ✏️ Pizarra</strong>: Dibujo a mano o escalonar con Gauss.</li>
                  <li>• <strong className="text-cyan-300">Tecla E</strong>: Power-up Éstasis (congela 10 segundos el temporizador).</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => {
                if (isHowToPlayFromMenu) {
                  setIsHowToPlayFromMenu(false);
                  setIsGameMenuOpen(true);
                } else {
                  setCurrentScreen('START');
                }
              }}
              autoFocus
              className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              VOLVER
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: MAPA GALÁCTICO */}
      {/* ========================================================================= */}
      {currentScreen === 'GALAXY_MAP' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-xl bg-slate-950 border-2 border-cyan-500/60 rounded-2xl p-5 md:p-6 shadow-2xl flex flex-col text-slate-100">
            <h2 className="text-xl font-black text-cyan-400 tracking-wider text-center mb-1">
              MAPA GALÁCTICO
            </h2>
            <p className="text-xs text-slate-400 text-center mb-5">
              Selecciona un sector estelar para pilotar la nave GAUSS-01:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {SECTOR_METAS.map((sec) => {
                const prog = sectorsProgress[sec.id] || {
                  unlocked: sec.id === 1,
                  stars: 0,
                  bestScore: 0,
                };
                const isUnlocked = demoMode || prog.unlocked;

                return (
                  <button
                    key={sec.id}
                    disabled={!isUnlocked}
                    onClick={() => startSector(sec.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isUnlocked
                        ? sec.isBoss
                          ? 'bg-rose-950/40 border-rose-500/60 hover:bg-rose-900/40 hover:scale-[1.02]'
                          : 'bg-slate-900/80 border-slate-700 hover:border-cyan-400 hover:scale-[1.02]'
                        : 'bg-slate-900/30 border-slate-800 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-cyan-400">
                          Sector {sec.id}
                        </span>
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <span key={i}>{i < prog.stars ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                      <div className="font-bold text-sm text-slate-100 mt-1">
                        {sec.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{sec.subtitle}</div>
                    </div>

                    <div className="mt-2 text-[10px] font-mono text-slate-500">
                      {isUnlocked
                        ? `Tiempo: ${sec.timeLimit}s ${sec.isBoss ? '· JEFE' : ''}`
                        : '🔒 Bloqueado'}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentScreen('START')}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
            >
              VOLVER AL MENÚ
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 5: INFORME DE MISIÓN */}
      {/* ========================================================================= */}
      {currentScreen === 'MISSION_REPORT' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-md bg-slate-950 border-2 border-cyan-400 rounded-2xl p-6 shadow-2xl flex flex-col text-slate-100">
            <h2 className="text-xl font-black text-cyan-400 tracking-wider text-center mb-1">
              INFORME DE MISIÓN
            </h2>
            <p className="text-xs text-slate-400 text-center mb-4">
              Sector {selectedSectorId}: {currentSectorMeta.name}
            </p>

            {/* Stars */}
            <div className="flex items-center justify-center gap-2 text-2xl text-amber-400 mb-4">
              {Array.from({ length: 3 }).map((_, i) => {
                const earned = sectorsProgress[selectedSectorId]?.stars ?? 0;
                return <span key={i}>{i < earned ? '★' : '☆'}</span>;
              })}
            </div>

            {/* Stats Breakdown */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 mb-4 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Puntaje del Sector:</span>
                <span className="text-yellow-400 font-bold">{gameState.score} pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sistemas Acertados:</span>
                <span className="text-cyan-300 font-bold">
                  {roundStatsRef.current.correctCount} / {sectorRounds.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aciertos ÚNICA:</span>
                <span className="text-yellow-300 font-bold">
                  {roundStatsRef.current.correctByType.UNICA}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aciertos INFINITAS:</span>
                <span className="text-cyan-300 font-bold">
                  {roundStatsRef.current.correctByType.INFINITAS}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Aciertos NINGUNA:</span>
                <span className="text-rose-300 font-bold">
                  {roundStatsRef.current.correctByType.NINGUNA}
                </span>
              </div>
            </div>

            {/* RANGO's debrief advice */}
            <div className="bg-slate-900/60 p-3 rounded-xl border border-cyan-500/30 flex items-start gap-2.5 mb-5 text-xs">
              <span className="text-lg">🤖</span>
              <p className="text-slate-300 leading-relaxed">
                {roundStatsRef.current.correctCount >= 3
                  ? '¡Excelente precisión hiperespacial! Demostraste un dominio sólido de las relaciones de rangos.'
                  : 'Falta un poco más de práctica en este sector. Recuerda: si al escalonar sale 0 = c (con c ≠ 0), ¡el sistema es incompatible!'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => startSector(selectedSectorId)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                REPETIR SECTOR
              </button>
              {selectedSectorId < 6 && (
                <button
                  onClick={() => startSector(selectedSectorId + 1)}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg"
                >
                  SIGUIENTE SECTOR {'→'}
                </button>
              )}
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: VICTORY FINAL */}
      {/* ========================================================================= */}
      {currentScreen === 'VICTORY' && (
        <MenuOverlay tone="victory" zIndex={60}>
          <div className="w-full max-w-lg bg-slate-950 border-2 border-emerald-400 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="text-4xl mb-2 animate-bounce">🏆</div>
            <h1 className="text-xl md:text-2xl font-black text-emerald-400 tracking-wider mb-2">
              ¡PILOTO CERTIFICADO EN ROUCHÉ–FROBENIUS!
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mb-5 leading-relaxed">
              Has derrotado al temible Agujero Negro y clasificado todos los sistemas estelares de la galaxia. ¡La tripulación de la nave GAUSS-01 y RANGO te rinden homenaje!
            </p>

            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-500/40 w-full mb-6 text-sm font-mono text-yellow-400 font-bold">
              PUNTAJE FINAL TOTAL: {gameState.score} PUNTOS
            </div>

            <div className="w-full flex items-center gap-3">
              <button
                onClick={() => startSector(1)}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs md:text-sm uppercase tracking-wider rounded-xl shadow-lg transition-transform active:scale-95"
              >
                JUGAR DE NUEVO
              </button>
              <button
                onClick={() => setCurrentScreen('START')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors"
              >
                MENÚ
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* ========================================================================= */}
      {/* SCREEN: GAME MENU / PAUSE OVERLAY */}
      {/* ========================================================================= */}
      {isGameMenuOpen && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-sm bg-slate-950 border-2 border-cyan-500/60 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-slate-100">
            <h2 className="text-xl font-black text-cyan-400 tracking-wider mb-4">
              MENÚ DE PAUSA
            </h2>

            <div className="w-full flex flex-col gap-2.5 mb-5">
              <button
                onClick={() => setIsGameMenuOpen(false)}
                autoFocus
                className="w-full min-h-[48px] py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Play size={16} /> REANUDAR
              </button>

              <button
                onClick={() => setIsMusicMuted((prev) => !prev)}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isMusicMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                Música: {isMusicMuted ? 'Silenciada' : 'Activada'}
              </button>

              <button
                onClick={() => {
                  const muted = gameAudio.toggleMute();
                  setIsSfxMuted(muted);
                }}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isSfxMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                Efectos SFX: {isSfxMuted ? 'Silenciados' : 'Activados'}
              </button>

              <button
                onClick={() => {
                  setIsHowToPlayFromMenu(true);
                  setIsGameMenuOpen(false);
                  setCurrentScreen('HOW_TO_PLAY');
                }}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <HelpCircle size={16} /> CÓMO JUGAR
              </button>

              <button
                onClick={() => {
                  setIsGameMenuOpen(false);
                  startSector(selectedSectorId);
                }}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCw size={16} /> REINICIAR SECTOR
              </button>

              <button
                onClick={() => {
                  setIsGameMenuOpen(false);
                  setCurrentScreen('START');
                  setGameState((prev) => ({ ...prev, status: 'START' }));
                }}
                className="w-full min-h-[48px] py-2.5 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Home size={16} /> VOLVER AL MENÚ PRINCIPAL
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}
    </div>
  );
}
