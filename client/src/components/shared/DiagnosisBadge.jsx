import React from "react";
import { Badge } from "react-bootstrap";

const DiagnosisBadge = ({ type, value }) => {
    if (!value) return null;
    const variant =
        type === "ai" ? "info" : type === "doctor" ? "success" : "secondary";
    const label = type === "ai" ? "AI" : "Bác sĩ";

    return (
        <Badge bg={variant} className="me-2">
            {label}: {value}
        </Badge>
    );
};

export default DiagnosisBadge;
