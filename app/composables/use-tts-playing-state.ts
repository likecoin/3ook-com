export function useTTSPlayingState() {
  const isPlaying = useState('tts-playing', () => false)
  return { isTTSPlaying: isPlaying }
}
