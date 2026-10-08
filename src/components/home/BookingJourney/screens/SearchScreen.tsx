import type { CSSProperties } from "react";
import { CalendarBlankIcon, MapPinIcon, MagnifyingGlassIcon, UsersIcon } from "@phosphor-icons/react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { JourneyDestination } from "../journeyData";
import styles from "../BookingJourney.module.css";

interface SearchScreenProps {
    destinations: JourneyDestination[];
    dateRange: string;
}

const TYPE_START = 0.2;
const TYPE_STEP = 0.05;

// Màn 1 — ô tìm kiếm tự gõ tên điểm đến, gợi ý tỉnh/thành hiện lần lượt bên dưới.
export default function SearchScreen({ destinations, dateRange }: SearchScreenProps) {
    const { t } = useLanguage();
    const typed = destinations[0]?.name ?? "";
    const typedEnd = TYPE_START + typed.length * TYPE_STEP;

    return (
        <div className={styles.screenBody}>
            <div className={styles.fakeSearch}>
                <div className={`${styles.fakeField} ${styles.fakeFieldWide}`}>
                    <span className={styles.fakeLabel}>
                        <MapPinIcon size={12} weight="bold" /> {t("search.provinceLabel")}
                    </span>
                    <span className={`${styles.fakeControl} ${styles.fakeControlFocus}`}>
                        <span className={styles.typed}>
                            {Array.from(typed).map((char, i) => (
                                <span
                                    key={i}
                                    className={styles.char}
                                    style={{ "--d": `${TYPE_START + i * TYPE_STEP}s` } as CSSProperties}
                                >
                                    {char}
                                </span>
                            ))}
                        </span>
                        <span className={styles.caret} />
                    </span>
                </div>
                <div className={styles.fakeField}>
                    <span className={styles.fakeLabel}>
                        <CalendarBlankIcon size={12} weight="bold" /> {t("search.checkinLabel")}
                    </span>
                    <span className={styles.fakeControl}>{dateRange}</span>
                </div>
                <div className={styles.fakeField}>
                    <span className={styles.fakeLabel}>
                        <UsersIcon size={12} weight="bold" /> {t("search.guestsLabel")}
                    </span>
                    <span className={styles.fakeControl}>{t("search.guestsValue", { count: 2 })}</span>
                </div>
            </div>

            <div className={styles.suggestTitle}>{t("home.steps.search.suggest")}</div>
            <ul className={styles.suggestList}>
                {destinations.map((destination, i) => (
                    <li
                        key={destination.id}
                        className={`${styles.suggest} ${styles.pop} ${i === 0 ? styles.suggestActive : ""}`}
                        style={{ "--d": `${typedEnd + 0.1 + i * 0.08}s` } as CSSProperties}
                    >
                        <span className={styles.suggestIcon}>
                            <MapPinIcon size={16} weight="light" />
                        </span>
                        <span className={styles.suggestName}>{destination.name}</span>
                        {destination.hotelCount !== null && (
                            <span className={styles.suggestMeta}>
                                {t("home.hotelsCount", { count: destination.hotelCount })}
                            </span>
                        )}
                    </li>
                ))}
            </ul>

            <div
                className={`${styles.fakeSubmit} ${styles.pop}`}
                style={{ "--d": `${typedEnd + 0.5}s` } as CSSProperties}
            >
                <MagnifyingGlassIcon size={15} weight="bold" />
                {t("search.submitFind")}
            </div>
        </div>
    );
}
