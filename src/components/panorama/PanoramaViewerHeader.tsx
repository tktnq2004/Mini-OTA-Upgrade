"use client";

import { ArrowUUpLeftIcon, XIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import styles from "./PanoramaViewerHeader.module.css";

interface PanoramaViewerHeaderProps {
    hotelName: string;
    sceneName: string;
    onClose: () => void;
    onReturn: () => void;
    canReturn: boolean;
}

// Port của ViewerHeader.tsx (bản React Native). "Back to home" ở bản gốc
// nghĩa là thoát về màn hình chọn địa điểm của app di động — trên web không
// có màn hình đó, hành động tương ứng là đóng hẳn overlay để quay lại trang
// chi tiết phòng, nên đổi nhãn thành "Đóng" cho đúng ngữ cảnh thay vì dịch
// nguyên văn "Về trang chủ".
export default function PanoramaViewerHeader({
    hotelName,
    sceneName,
    onClose,
    onReturn,
    canReturn,
}: PanoramaViewerHeaderProps) {
    const { t } = useLanguage();

    return (
        <div className={styles.header}>
            <div className={styles.leftButtons}>
                {canReturn && (
                    <button type="button" className={styles.chipButton} onClick={onReturn}>
                        <ArrowUUpLeftIcon size={14} weight="bold" />
                        {t("panorama.return")}
                    </button>
                )}
                <button type="button" className={styles.chipButton} onClick={onClose}>
                    <XIcon size={14} weight="bold" />
                    {t("panorama.close")}
                </button>
            </div>

            <div className={styles.titleChip}>
                <span className={styles.hotelName}>{hotelName}</span>
                <span className={styles.sceneName}>{sceneName}</span>
            </div>
        </div>
    );
}
