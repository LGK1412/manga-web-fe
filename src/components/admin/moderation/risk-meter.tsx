interface RiskMeterProps {
  score: number
}

export function RiskMeter({ score }: RiskMeterProps) {
  const getColor = () => {
    if (score < 30) return "bg-green-500"
    if (score < 60) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getLabel = () => {
    if (score < 30) return "Low"
    if (score < 60) return "Medium"
    return "High"
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${getColor()}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-sm font-medium whitespace-nowrap">{score}</span>
      <span className="text-xs text-muted-foreground">{getLabel()}</span>
    </div>
  )
}
