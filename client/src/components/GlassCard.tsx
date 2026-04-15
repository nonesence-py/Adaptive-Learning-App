import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = true, ...props }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)' } : undefined}
      className={cn('glass-card p-5', className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  sub,
  color = 'blue',
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorMap = {
    blue: 'from-blue-500 to-blue-400 text-blue-600 bg-blue-50',
    green: 'from-emerald-500 to-emerald-400 text-emerald-600 bg-emerald-50',
    amber: 'from-amber-500 to-amber-400 text-amber-600 bg-amber-50',
    red: 'from-red-500 to-red-400 text-red-600 bg-red-50',
    purple: 'from-violet-500 to-violet-400 text-violet-600 bg-violet-50',
  };
  const [gradientClass, textClass, bgClass] = colorMap[color].split(' ');

  return (
    <GlassCard className="flex items-start gap-4">
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center text-white bg-gradient-to-br shrink-0', gradientClass, colorMap[color].split(' ')[0].replace('from', 'to').length ? '' : '', `from-${color === 'blue' ? 'blue-500' : color === 'green' ? 'emerald-500' : color === 'amber' ? 'amber-500' : color === 'red' ? 'red-500' : 'violet-500'} to-${color === 'blue' ? 'blue-400' : color === 'green' ? 'emerald-400' : color === 'amber' ? 'amber-400' : color === 'red' ? 'red-400' : 'violet-400'}`)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className={cn('text-xs font-medium mt-0.5', textClass)}>{sub}</p>}
      </div>
    </GlassCard>
  );
}
