import { useEffect, useState, useRef } from "react"

export default function useECGStream(fullSignal, sampleRate = 250, chunkDuration = 0.1) {
    const [displayData, setDisplayData] = useState([])
    const currentIndex = useRef(0)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!fullSignal || fullSignal.length === 0) return

        const chunkSize = sampleRate * chunkDuration // số mẫu mỗi lần update
        const windowSize = sampleRate * 5 // hiển thị 5s (1250 mẫu)

        clearInterval(intervalRef.current)

        // ✅ Nếu đủ dữ liệu → hiển thị ngay 5s đầu tiên
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

            setDisplayData(prev => {
                const combined = [...prev, ...nextChunk]
                return combined.slice(-windowSize) // cuộn cửa sổ
            })

            currentIndex.current += chunkSize
        }, chunkDuration * 1000)

        return () => clearInterval(intervalRef.current)
    }, [fullSignal])

    return displayData
}
