"use client";

import { InfoIcon, XIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { PanoramaHotspot } from "./types";
import styles from "./HotspotInfoModal.module.css";

interface HotspotInfoModalProps {
    info: PanoramaHotspot | null;
    onClose: () => void;
}

export default function HotspotInfoModal({ info, onClose }: HotspotInfoModalProps) {
    const { t } = useLanguage();
    if (!info) return null;

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.card} onClick={(e) => e.stopPropagation()}>
                <span className={styles.iconBadge}>
                    <InfoIcon size={18} weight="bold" />
                </span>

                <h3 className={styles.name}>{info.name}</h3>
                {info.description && <p className={styles.description}>{info.description}</p>}

                <button type="button" className={styles.closeButton} onClick={onClose}>
                    <XIcon size={14} weight="bold" />
                    {t("panorama.close")}
                </button>
            </div>
        </div>
    );
}
