import { useEffect, useState, useRef } from "react"

// Giúp mô phỏng tín hiệu chạy realtime (0.5s thêm 125 mẫu)
export default function useECGStream(fullSignal, sampleRate = 250, chunkDuration = 0.1) {
    const [displayData, setDisplayData] = useState([])
    const currentIndex = useRef(0)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!fullSignal || fullSignal.length === 0) return

        // reset khi có tín hiệu mới
        setDisplayData([])
        currentIndex.current = 0

        const chunkSize = sampleRate * chunkDuration // 25 mẫu
        const windowSize = sampleRate * 5 // 1250 mẫu / 4s

        intervalRef.current = setInterval(() => {
            const nextChunk = fullSignal.slice(
                currentIndex.current,
                currentIndex.current + chunkSize
            )
            if (nextChunk.length === 0) {
                clearInterval(intervalRef.current)
                return
            }

            setDisplayData(prev => {
                const combined = [...prev, ...nextChunk]
                return combined.slice(-windowSize)
            })

            currentIndex.current += chunkSize
        }, chunkDuration * 1000)

        return () => clearInterval(intervalRef.current)
    }, [fullSignal])

    return displayData
}
