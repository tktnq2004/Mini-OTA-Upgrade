import type { CSSProperties } from "react";
import controls from "@/styles/controls.module.css";
import Skeleton from "./Skeleton";

interface FieldSkeletonProps {
    labelWidth?: CSSProperties["width"];
}

// Khung xương 1 ô nhập trong form (nhãn + input 38px) — cùng khoảng cách với controls.field.
export default function FieldSkeleton({ labelWidth = 84 }: FieldSkeletonProps) {
    return (
        <div className={controls.field}>
            <Skeleton width={labelWidth} height={12} />
            <Skeleton height={38} />
        </div>
    );
}
