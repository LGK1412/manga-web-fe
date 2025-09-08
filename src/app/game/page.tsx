"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

interface GameHistory {
  id: number
  time: string
  bet: number
  result: string
  profit: number
  balance: number
}

const wheelSections = [
  { multiplier: "x2", color: "#FF1744", probability: 12 }, // Đỏ rực rỡ
  { multiplier: "x0.5", color: "#00E676", probability: 25 }, // Xanh lá neon
  { multiplier: "x1.5", color: "#2196F3", probability: 20 }, // Xanh dương đậm
  { multiplier: "x3", color: "#FF9800", probability: 2 }, // Cam vàng
  { multiplier: "x1", color: "#9C27B0", probability: 35 }, // Tím đậm
  { multiplier: "x2.5", color: "#FFD700", probability: 6 }, // Vàng kim
]

export default function GamePage() {
  const [points, setPoints] = useState(1000)
  const [betAmount, setBetAmount] = useState(50)
  const [isSpinning, setIsSpinning] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [history, setHistory] = useState<GameHistory[]>([])
  const [resultMessage, setResultMessage] = useState("Kết quả: x1. Bạn nhận được 50 điểm.")
  const [autoSpin, setAutoSpin] = useState(false)
  const autoSpinRef = useRef<boolean>(false)
  const wheelRef = useRef<HTMLDivElement | null>(null)

  const SECTION_ANGLE = 360 / wheelSections.length // 60 degrees per section
  const DURATION_MS = 3000

  const getRandomResult = () => {
    const random = Math.random() * 100
    let cumulative = 0

    for (const section of wheelSections) {
      cumulative += section.probability
      if (random <= cumulative) {
        return section
      }
    }
    return wheelSections[0]
  }

  const spin = () => {
    if (isSpinning || betAmount > points || betAmount <= 0) return
    setIsSpinning(true)

    const result = getRandomResult()
    const multiplier = Number.parseFloat(result.multiplier.replace("x", ""))
    const winAmount = Math.floor(betAmount * multiplier)
    const profit = winAmount - betAmount
    const newBalance = points + profit

    // Tính toán để kim chỉ vào GIỮA ô kết quả
    const sectionIndex = wheelSections.findIndex((s) => s.multiplier === result.multiplier)
    const targetAngle = sectionIndex * SECTION_ANGLE + SECTION_ANGLE / 2 // Giữa ô
    const spins = 5 + Math.random() * 3 // 5-8 vòng quay

    // LUÔN TĂNG GÓC (thuận chiều) - không reset rotation
    const delta = spins * 360 + (360 - targetAngle)
    setRotation((prev) => prev + delta)

    // CHỜ animation xong hẵng xử lý
    const onEnd = () => {
      wheelRef.current?.removeEventListener("transitionend", onEnd)

      setPoints(newBalance)
      setIsSpinning(false)

      const item: GameHistory = {
        id: Date.now(),
        time: new Date().toLocaleString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        bet: betAmount,
        result: result.multiplier,
        profit,
        balance: newBalance,
      }
      setHistory((prev) => [item, ...prev.slice(0, 9)])
      setResultMessage(
        `Kết quả: ${result.multiplier}. ${profit >= 0 ? `Bạn nhận được ${winAmount} điểm.` : `Bạn mất ${Math.abs(profit)} điểm.`}`,
      )

      // Auto spin logic - gọi ngay sau khi animation xong
      if (autoSpinRef.current && newBalance >= betAmount) {
        setTimeout(() => {
          if (autoSpinRef.current) {
            spin() // Gọi lại spin() ngay lập tức
          }
        }, 500) // delay nhỏ giữa các lượt
      } else if (autoSpinRef.current && newBalance < betAmount) {
        setAutoSpin(false)
        autoSpinRef.current = false
        setResultMessage("Auto spin dừng: Không đủ điểm để tiếp tục.")
      }
    }

    // Lắng nghe transitionend một lần
    wheelRef.current?.addEventListener("transitionend", onEnd, { once: true })
  }

  const resetPoints = () => {
    setPoints(1000)
    setHistory([])
    setResultMessage("Điểm đã được reset về 1000.")
    setAutoSpin(false)
    autoSpinRef.current = false
  }

  const toggleAutoSpin = () => {
    if (autoSpin) {
      setAutoSpin(false)
      autoSpinRef.current = false
      if (isSpinning) {
        setResultMessage("Auto spin sẽ dừng sau lượt này...")
      }
    } else {
      setAutoSpin(true)
      autoSpinRef.current = true
      if (!isSpinning) {
        spin()
      }
    }
  }
  console.log(process.env.NEXT_PUBLIC_API_URL)
  console.log(process.env.JWT_SECRET)
  return (
    <div className="min-h-screen bg-slate-900 text-white pt-20 pb-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <div className="mb-6">
          <Button asChild variant="outline" className="border-slate-600 text-white bg-slate-700">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Về trang chủ
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-8">
          {/* Game Wheel Section - Full width */}
          <div className="w-full">
            <Card className="bg-slate-800 border-slate-600 p-8">
              <h2 className="text-2xl font-bold mb-8 text-center text-white">Vòng quay cược điểm</h2>

              {/* Wheel Container - Larger */}
              <div className="relative mx-auto mb-8" style={{ width: "400px", height: "400px" }}>
                {/* Pointer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
                  <div className="w-0 h-0 border-l-6 border-r-6 border-b-12 border-l-transparent border-r-transparent border-b-yellow-400 drop-shadow-lg"></div>
                </div>

                {/* Circular Wheel */}
                <div
                  ref={wheelRef}
                  className="w-full h-full rounded-full relative overflow-hidden transition-transform duration-[3000ms] ease-out border-4 border-slate-500"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    background: `conic-gradient(
                      from 0deg,
                      #FF1744 0deg 60deg,
                      #00E676 60deg 120deg,
                      #2196F3 120deg 180deg,
                      #FF9800 180deg 240deg,
                      #9C27B0 240deg 300deg,
                      #FFD700 300deg 360deg
                    )`,
                  }}
                >
                  {/* Text labels positioned absolutely */}
                  {wheelSections.map((section, i) => {
                    const centerAngle = i * SECTION_ANGLE + SECTION_ANGLE / 2
                    const centerRad = ((centerAngle - 90) * Math.PI) / 180
                    const radius = 120

                    const x = 200 + Math.cos(centerRad) * radius
                    const y = 200 + Math.sin(centerRad) * radius

                    return (
                      <div
                        key={i}
                        className="absolute font-bold text-2xl pointer-events-none flex items-center justify-center"
                        style={{
                          left: `${x}px`,
                          top: `${y}px`,
                          transform: "translate(-50%, -50%)",
                          textShadow: "3px 3px 6px rgba(0,0,0,0.9), -3px -3px 6px rgba(0,0,0,0.9)",
                          color: "#FFFFFF",
                          width: "60px",
                          height: "60px",
                          textAlign: "center",
                          lineHeight: "1",
                          zIndex: 10,
                        }}
                      >
                        {section.multiplier}
                      </div>
                    )
                  })}

                  {/* Center circle */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-slate-800 rounded-full w-20 h-20 flex items-center justify-center border-2 border-slate-500 z-20">
                      <div className="text-white font-bold text-sm">SPIN</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Controls */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-medium mb-3 text-slate-300">Điểm hiện có</label>
                  <div className="bg-slate-700 p-4 rounded-lg text-center font-bold text-xl border border-slate-600 text-white">{points.toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-3 text-slate-300">Tiền cược</label>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(1, Number.parseInt(e.target.value) || 1))}
                    className="bg-slate-700 border-slate-600 text-white text-center font-bold text-lg py-3 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    min="1"
                    max={points}
                    disabled={isSpinning || autoSpin}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-6 mb-6">
                <Button
                  onClick={spin}
                  disabled={isSpinning || betAmount > points || betAmount <= 0 || autoSpin}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg"
                >
                  {isSpinning ? "Đang quay..." : "Quay ngay"}
                </Button>
                <Button
                  onClick={toggleAutoSpin}
                  disabled={betAmount > points || betAmount <= 0}
                  variant="outline"
                  className={`flex-1 font-bold py-4 text-lg border-2 ${autoSpin
                      ? "border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
                      : "border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                    }`}
                >
                  {autoSpin ? "Dừng auto" : "Quay auto"}
                </Button>
              </div>

              {/* Result Message */}
              <div className="text-center text-blue-300 font-medium text-lg bg-slate-700 p-4 rounded-lg border border-slate-600">{resultMessage}</div>
            </Card>
          </div>

          {/* History Section - Moved below */}
          <div className="w-full">
            <Card className="bg-slate-800 border-slate-600 p-8">
              <h3 className="text-2xl font-bold mb-6 text-center text-white">Lịch sử lượt quay</h3>

              <div className="overflow-x-auto">
                <table className="w-full text-base min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-500">
                      <th className="text-left py-4 px-4 text-base font-semibold min-w-[140px] text-slate-300">Thời gian</th>
                      <th className="text-center py-4 px-4 text-base font-semibold min-w-[100px] text-slate-300">Tiền cược</th>
                      <th className="text-center py-4 px-4 text-base font-semibold min-w-[100px] text-slate-300">Kết quả</th>
                      <th className="text-center py-4 px-4 text-base font-semibold min-w-[100px] text-slate-300">Lãi/Lỗ</th>
                      <th className="text-right py-4 px-4 text-base font-semibold min-w-[120px] text-slate-300">Số dư</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-slate-400 text-lg">
                          Chưa có lịch sử
                        </td>
                      </tr>
                    ) : (
                      history.map((item) => (
                        <tr key={item.id} className="border-b border-slate-600 hover:bg-slate-700/50 transition-colors">
                          <td className="py-4 px-4 text-base text-slate-300">{item.time}</td>
                          <td className="text-center py-4 px-4 text-base font-semibold text-white">{item.bet.toLocaleString()}</td>
                          <td className="text-center py-4 px-4 font-bold text-lg text-blue-300">{item.result}</td>
                          <td
                            className={`text-center py-4 px-4 font-bold text-lg ${item.profit >= 0 ? "text-green-400" : "text-red-400"
                              }`}
                          >
                            {item.profit >= 0 ? "+" : ""}
                            {item.profit.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 text-base font-semibold text-white">{item.balance.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Statistics Summary */}
              {history.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-500">
                  <h4 className="text-lg font-semibold mb-6 text-slate-300 text-center">Thống kê tổng quan</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-base">
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-2">Tổng lượt quay</div>
                      <div className="font-bold text-white text-xl">{history.length}</div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-2">Tổng cược</div>
                      <div className="font-bold text-white text-xl">
                        {history.reduce((sum, item) => sum + item.bet, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-2">Tổng lãi/lỗ</div>
                      <div
                        className={`font-bold text-xl ${history.reduce((sum, item) => sum + item.profit, 0) >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                      >
                        {history.reduce((sum, item) => sum + item.profit, 0) >= 0 ? "+" : ""}
                        {history.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-2">Tỷ lệ thắng</div>
                      <div className="font-bold text-white text-xl">
                        {Math.round((history.filter((item) => item.profit > 0).length / history.length) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
