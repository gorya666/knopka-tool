import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface ShimmerTextProps {
  children: React.ReactNode
  className?: string
  duration?: number
  delay?: number
}

// Shimmer moves a lighter highlight across dark text left→right, repeating.
// Works on white background with black text — the shimmer lightens briefly
// as it scans across, giving a "processing / computing" feel.
export function ShimmerText({
  children,
  className,
  duration = 1.2,
  delay = 0.2,
}: ShimmerTextProps) {
  return (
    <motion.span
      className={cn('inline-block', className)}
      style={{
        WebkitTextFillColor: 'transparent',
        background:
          'currentColor linear-gradient(to right, currentColor 0%, rgba(255,255,255,0.55) 40%, rgba(255,255,255,0.55) 60%, currentColor 100%)',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '50% 200%',
      } as React.CSSProperties}
      initial={{ backgroundPositionX: '250%' }}
      animate={{ backgroundPositionX: ['-100%', '250%'] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay: 1.8,
        ease: 'linear',
      }}
    >
      {children}
    </motion.span>
  )
}
