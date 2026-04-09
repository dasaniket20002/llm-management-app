import { env } from '#/lib/utils/env'
import { cn } from '#/lib/utils/utils'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'
import { ChartNoAxesGantt } from 'lucide-react'

const textVariants = cva(
  'h-6 flex items-center gap-3 font-cabinet-grotesk font-medium',
  {
    variants: {
      textVariant: {
        primary: 'text-primary',
        foreground: 'text-foreground',
      },
    },
  },
)

const iconVariants = cva(
  'aspect-square place-content-center place-items-center rounded overflow-hidden text-primary',
  {
    variants: {
      iconVariant: {
        accent: 'bg-accent',
        secondary: 'bg-secondary',
        background: 'bg-background',
        foreground: 'bg-foreground',
        card: 'bg-card ring-1 ring-foreground/10',
      },
    },
  },
)

export default function Logo({
  includeName = false,
  className,
  textVariant = 'primary',
  iconVariant = 'accent',
}: {
  includeName?: boolean
  className?: string
} & VariantProps<typeof textVariants> &
  VariantProps<typeof iconVariants>) {
  if (!includeName) {
    return (
      <div className={cn(iconVariants({ iconVariant, className }))}>
        <ChartNoAxesGantt className="size-4 -rotate-12" />
      </div>
    )
  }
  return (
    <div className={cn(textVariants({ textVariant, className }))}>
      <div className={cn(iconVariants({ iconVariant, className: 'h-full' }))}>
        <ChartNoAxesGantt className="size-4 -rotate-12" />
      </div>
      {env.VITE_APP_TITLE}
    </div>
  )
}
