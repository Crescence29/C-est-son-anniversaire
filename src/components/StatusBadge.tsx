import React from 'react';
import { OrderStatus } from '../types.ts';
import { Clock, CheckCircle2, PlayCircle, Gift, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const config: Record<
    OrderStatus,
    { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
  > = {
    pending_payment: {
      label: 'En attente de paiement',
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-500/30',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    paid: {
      label: 'Payée',
      bg: 'bg-blue-500/10',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-500/30',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    },
    accepted: {
      label: 'Acceptée régie',
      bg: 'bg-violet/10',
      text: 'text-violet',
      border: 'border-violet/30',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
    },
    in_progress: {
      label: 'En cours',
      bg: 'bg-rose-brand/10',
      text: 'text-rose-brand',
      border: 'border-rose-brand/30',
      icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />,
    },
    delivered: {
      label: 'Livrée 🎉',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-500/30',
      icon: <Gift className="w-3.5 h-3.5" />,
    },
    cancelled: {
      label: 'Annulée',
      bg: 'bg-gray-500/10',
      text: 'text-gray-600 dark:text-gray-300',
      border: 'border-gray-500/30',
      icon: <XCircle className="w-3.5 h-3.5" />,
    },
    refunded: {
      label: 'Remboursée',
      bg: 'bg-red-500/10',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-500/30',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
    },
  };

  const item = config[status] || {
    label: status,
    bg: 'bg-gray-100 dark:bg-white/10',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-white/10',
    icon: null,
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-sm transition-all ${item.bg} ${item.text} ${item.border} ${sizeClasses[size]} ${className}`}
    >
      {item.icon}
      <span className="whitespace-nowrap font-mono">{item.label}</span>
    </span>
  );
};
