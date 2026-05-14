declare type ErrorLevel = 'info' | 'warning' | 'error'

declare interface ErrorHandlerTag {
  label: string
  icon?: string
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
  variant?: 'solid' | 'outline' | 'soft' | 'subtle'
}

declare interface ErrorHandlerAction extends ErrorHandlerTag {
  label: string
  onClick?: () => void
}
