import { useEffect, useRef, useState } from "react"

export default function useECGStream(
  fullSignal,
  sampleRate = 250,
  chunkDuration = 0.1,
  displayWindowSeconds = 5
) {
  const [displayData, setDisplayData] = useState([])
  const currentIndex = useRef(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    clearInterval(intervalRef.current)

    if (!fullSignal || fullSignal.length === 0) {
      currentIndex.current = 0
      setDisplayData([])
      return
    }

    const chunkSize = Math.max(1, Math.round(sampleRate * chunkDuration))
    const windowSize = Math.max(1, Math.round(sampleRate * displayWindowSeconds))

    const initialData = fullSignal.slice(0, windowSize)
    setDisplayData(initialData)
    currentIndex.current = windowSize

    intervalRef.current = setInterval(() => {
      const nextChunk = fullSignal.slice(
        currentIndex.current,
        currentIndex.current + chunkSize
      )

      if (nextChunk.length === 0) {
        clearInterval(intervalRef.current)
        return
      }

      setDisplayData((prev) => {
        const combined = [...prev, ...nextChunk]
        return combined.slice(-windowSize)
      })

      currentIndex.current += chunkSize
    }, chunkDuration * 1000)

    return () => clearInterval(intervalRef.current)
  }, [chunkDuration, displayWindowSeconds, fullSignal, sampleRate])

  return displayData
}
