export interface TTSTrialModalProps {
  nftClassId?: string
  onDismiss?: () => void
  onOpen?: () => void
  onClose?: () => void
  onVoiceSelected?: (languageVoice: string) => void
  onSnooze?: () => void
}
