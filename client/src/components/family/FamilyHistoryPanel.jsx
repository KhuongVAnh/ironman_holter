"use client"

import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import axios from "axios"
import { Card } from "react-bootstrap"
import { toast } from "react-toastify"
import MedicalHistoryList from "../shared/MedicalHistoryList"

const FamilyHistoryPanel = () => {
    const { patientId } = useParams()
    const [histories, setHistories] = useState([])

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/family/history/${patientId}`)
            setHistories(res.data)
        } catch (err) {
            console.error(err)
            toast.error("Không thể tải bệnh sử")
        }
    }

    useEffect(() => {
        if (patientId) fetchHistory()
    }, [patientId])

    return (
        <div className="container mt-4">
            <Card className="shadow-sm border-0 p-4">
                <h4 className="mb-3 text-primary">
                    <i className="fas fa-heartbeat me-2"></i>Bệnh sử bệnh nhân #{patientId}
                </h4>
                <MedicalHistoryList histories={histories} role="gia đình" />
            </Card>
        </div>
    )
}

export default FamilyHistoryPanel
