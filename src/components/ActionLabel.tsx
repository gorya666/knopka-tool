import { type ReactNode } from 'react'

interface ActionLabelProps {
  icon?: string
  onClick?: () => void
  children?: ReactNode
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  variant?: 'default' | 'danger'
}

export function ActionLabel({
  icon,
  onClick,
  children,
  className = '',
  disabled,
  size = 'md',
  variant = 'default',
}: ActionLabelProps) {
  const base =
    'inline-flex items-center gap-1.5 font-medium transition-[transform,color,background-color] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed'

  const sizes: Record<NonNullable<ActionLabelProps['size']>, string> = {
    sm: 'text-sm',
    md: 'text-sm',
  }

  const variants: Record<NonNullable<ActionLabelProps['variant']>, string> = {
    default: 'text-black hover:opacity-70',
    danger:  'text-red-500 hover:opacity-70',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[base, sizes[size], variants[variant], className].join(' ')}
    >
      {icon && <span className="nerd-icon text-[11px]">{icon}</span>}
      {children}
    </button>
  )
}
