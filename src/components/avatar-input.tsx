import { cn } from '#/lib/utils/utils'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Building, Camera, X } from 'lucide-react'

export interface AvatarUploadProps {
  id?: string
  name?: string
  /** The currently selected file (controlled) */
  value: File | null
  /** Called when a file is selected or cleared */
  onChange: (file: File | null) => void
  /** Whether the current value is invalid — controlled from outside */
  ariaInvalid?: boolean
  /** Whether the upload is disabled */
  disabled?: boolean
  /** Show a remove button when a file/src is present */
  removable?: boolean
  /** Additional className for the wrapper */
  className?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
} as const

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const

export function AvatarInput({
  id,
  name,
  value,
  onChange,
  ariaInvalid = false,
  disabled = false,
  removable = true,
  className,
  size = 'sm',
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string>()

  // Generate / revoke object URL for file preview
  useEffect(() => {
    if (!value) {
      setPreviewUrl(undefined)
      return
    }

    const url = URL.createObjectURL(value)
    setPreviewUrl(url)

    return () => {
      URL.revokeObjectURL(url)
    }
  }, [value])

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }, [disabled])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        inputRef.current?.click()
      }
    },
    [disabled],
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null
      // Always forward the file — parent decides if it's valid
      onChange(file)
      // Reset so re-selecting the same file still fires onChange
      e.target.value = ''
    },
    [onChange],
  )

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onChange(null)
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    },
    [onChange],
  )

  return (
    <div className={cn('relative group', className)}>
      {/* Clickable avatar */}
      <Avatar
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload avatar"
        aria-disabled={disabled}
        aria-invalid={ariaInvalid}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          sizeClasses[size],
          'cursor-pointer transition-all border border-transparent outline-none bg-clip-padding',
          'hover:opacity-80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        )}
      >
        <AvatarImage
          src={previewUrl}
          alt="Avatar preview"
          className="object-cover size-full"
        />
        <AvatarFallback
          className={cn(
            sizeClasses[size],
            'bg-muted text-muted-foreground transition-opacity opacity-100 group-hover:opacity-0 size-full',
          )}
        >
          <Building className={iconSizeClasses[size]} />
        </AvatarFallback>
      </Avatar>

      {/* Hover overlay */}
      {!disabled && !value && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'rounded-full bg-primary/10 text-primary',
            'group-hover:opacity-100 opacity-0 transition-opacity',
            'pointer-events-none',
          )}
        >
          <Camera className={iconSizeClasses[size]} />
        </div>
      )}

      {/* Remove button */}
      {removable && !disabled && value && (
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove avatar"
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'rounded-full bg-muted/80 text-destructive opacity-0 transition-opacity',
            'group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto',
            'cursor-pointer',
          )}
        >
          <X className={iconSizeClasses[size]} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        id={id}
        name={name}
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
