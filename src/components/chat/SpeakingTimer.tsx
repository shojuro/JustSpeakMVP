interface SpeakingTimerProps {
  totalSeconds: number
}

export default function SpeakingTimer({ totalSeconds }: SpeakingTimerProps) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return (
    <p className="text-sm text-success font-medium">
      Speaking time: {minutes}m {seconds}s
    </p>
  )
}