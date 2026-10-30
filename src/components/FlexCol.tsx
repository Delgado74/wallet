import { ReactNode } from 'react'

interface FlexColProps {
  between?: boolean
  border?: boolean
  centered?: boolean
  children: ReactNode
  className?: string
  end?: boolean
  gap?: string
  margin?: string
  padding?: string
  strech?: boolean
  testId?: string
  style?: React.CSSProperties
}

export default function FlexCol({
  between,
  border,
  centered,
  children,
  className,
  end,
  gap,
  margin,
  padding,
  strech,
  testId,
  style: styleProp,
}: FlexColProps) {
  const style: React.CSSProperties = {
    alignItems: centered ? 'center' : end ? 'end' : strech ? 'stretch' : 'start',
    borderBottom: border ? '1px solid var(--neutral-200)' : undefined,
    display: 'flex',
    flexDirection: 'column',
    gap: gap ?? '1rem',
    height: between ? '100%' : undefined,
    justifyContent: between ? 'space-between' : undefined,
    margin,
    padding,
    width: '100%',
    ...styleProp,
  }

  return (
    <div data-testid={testId ?? ''} style={style} className={className}>
      {children}
    </div>
  )
}
