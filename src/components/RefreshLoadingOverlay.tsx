import React from 'react';
import { Check, AlertTriangle, RefreshCw } from 'lucide-react';
import { RefreshStatus } from '../hooks/useRefreshProgress.ts';

interface RefreshLoadingOverlayProps {
  status: RefreshStatus;
  progress: number;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function candlesLitFor(progress: number): number {
  if (progress < 25) return 0;
  if (progress < 50) return 1;
  if (progress < 75) return 2;
  return 3;
}

const CANDLE_X = [37, 50, 63];

export const RefreshLoadingOverlay: React.FC<RefreshLoadingOverlayProps> = ({
  status,
  progress,
  errorMessage,
  onRetry,
  onDismiss,
}) => {
  if (status === 'idle') return null;

  const isError = status === 'error';
  const isSuccess = status === 'success';
  const litCount = isSuccess ? 3 : candlesLitFor(progress);
  const dashoffset = RING_CIRCUMFERENCE * (1 - (isSuccess ? 100 : progress) / 100);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-plum/70 backdrop-blur-md sheet-backdrop-in"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-full max-w-xs glass-card-dark rounded-3xl p-8 shadow-2xl border border-white/15 text-center refresh-card-in">
        <div className="relative w-36 h-36 mx-auto">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="6"
            />
            {!isError && (
              <circle
                cx="60"
                cy="60"
                r={RING_RADIUS}
                fill="none"
                stroke="url(#refresh-ring-gradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashoffset}
                className="refresh-ring-progress"
                style={{ filter: 'drop-shadow(0 0 6px rgba(217, 74, 118, 0.65))' }}
              />
            )}
            <defs>
              <linearGradient id="refresh-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d94a76" />
                <stop offset="100%" stopColor="#e2ab52" />
              </linearGradient>
            </defs>
          </svg>

          {/* Cake / success / error, centered inside the ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            {isError ? (
              <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center refresh-check-pop">
                <AlertTriangle className="w-7 h-7" />
              </div>
            ) : isSuccess ? (
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center refresh-check-pop">
                <Check className="w-8 h-8" strokeWidth={3} />
              </div>
            ) : (
              <svg viewBox="0 0 100 80" className="w-16 h-16">
                {CANDLE_X.map((x, i) => (
                  <g key={x}>
                    {/* wick / candle */}
                    <rect x={x - 2} y={20} width={4} height={22} rx={2} fill="#e2ab52" opacity={0.9} />
                    {/* flame */}
                    <ellipse
                      cx={x}
                      cy={i < litCount ? 13 : 18}
                      rx={i < litCount ? 4 : 2}
                      ry={i < litCount ? 7 : 2.5}
                      fill={i < litCount ? '#ffb84d' : '#6b6470'}
                      opacity={i < litCount ? 1 : 0.35}
                      className={i < litCount ? 'refresh-flame-flicker' : undefined}
                      style={i < litCount ? { filter: 'drop-shadow(0 0 5px rgba(255, 184, 77, 0.9))', transformOrigin: `${x}px 16px` } : undefined}
                    />
                  </g>
                ))}
                {/* frosting */}
                <rect x={10} y={42} width={80} height={16} rx={8} fill="#fdf6ec" />
                {/* cake body */}
                <rect x={14} y={50} width={72} height={26} rx={7} fill="#d94a76" />
                <rect x={14} y={50} width={72} height={7} fill="#c23e67" opacity={0.5} />
              </svg>
            )}
          </div>
        </div>

        {!isError && (
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {Math.round(isSuccess ? 100 : progress)}%
          </div>
        )}

        <h3 className="mt-3 font-serif font-bold text-base text-white">
          {isError ? 'Échec de l’actualisation' : isSuccess ? 'Actualisé !' : 'Actualisation en cours'}
        </h3>

        {isError ? (
          <>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              {errorMessage || 'Une erreur est survenue lors de l’actualisation.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                >
                  Fermer
                </button>
              )}
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-rose-brand hover:brightness-110 text-white text-xs font-bold transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Réessayer
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-[11px] text-white/50 mt-1">
              {isSuccess ? 'Vos données sont à jour.' : 'Mise à jour de vos données...'}
            </p>
            {!isSuccess && (
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <span className="refresh-dot" style={{ animationDelay: '0ms' }} />
                <span className="refresh-dot" style={{ animationDelay: '150ms' }} />
                <span className="refresh-dot" style={{ animationDelay: '300ms' }} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
