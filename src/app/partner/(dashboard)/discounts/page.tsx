"use client";

import controls from "@/styles/controls.module.css";
import DiscountTag from "@/components/DiscountTag/DiscountTag";
import DiscountForm from "@/components/discounts/DiscountForm";
import { STATUS_LABEL, statusOf, type DiscountStatus } from "@/components/discounts/discountRules";
import { useDiscountManager } from "@/components/discounts/useDiscountManager";
import { formatDateVn } from "@/lib/format";
import styles from "../../partner.module.css";
import page from "./discounts.module.css";

const STATUS_TONE: Record<DiscountStatus, string> = {
    running: styles.toneSuccess,
    upcoming: styles.toneInfo,
    ended: styles.toneNeutral,
    paused: styles.toneWarning,
};

// Khuyến mãi của hotel mình — cùng logic với trang admin (useDiscountManager), backend
// tự giới hạn về hotel của owner/staff.
export default function PartnerDiscountsPage() {
    const m = useDiscountManager();
    const { list, formState } = m;

    if (m.accessError) return <p className={controls.error}>{m.accessError}</p>;

    return (
        <div>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Giảm giá</h1>
                    <p className={styles.subtitle}>
                        Tag giảm giá hiện trên phòng của khách sạn bạn, tính theo từng đêm ở trong khoảng ngày đã chọn.
                    </p>
                </div>
                {m.permissions.canCreate && (
                    <button type="button" className={controls.button} onClick={m.openCreate} disabled={!m.ready}>
                        + Tạo giảm giá
                    </button>
                )}
            </header>

            <form className={styles.toolbar} onSubmit={list.search}>
                <input
                    type="search"
                    className={`${controls.input} ${styles.compactInput}`}
                    placeholder="Tìm theo tên tag"
                    aria-label="Tìm giảm giá"
                    value={list.query}
                    onChange={(e) => list.setQuery(e.target.value)}
                />
                <button type="submit" className={controls.buttonGhost}>
                    Tìm
                </button>
            </form>

            {list.error && <p className={controls.error}>{list.error}</p>}

            <div className={styles.split}>
                <section className={`${styles.stack} ${styles.splitMain}`} aria-label="Danh sách giảm giá">
                    {list.discounts.length === 0 && (
                        <p className={`${styles.cardFlush} ${styles.empty}`}>
                            {list.loading ? "Đang tải..." : "Chưa có chương trình giảm giá nào."}
                        </p>
                    )}
                    {list.discounts.map((d) => {
                        const status = statusOf(d, m.today);
                        return (
                            <article key={d.id} className={page.card}>
                                <DiscountTag discount={d} />
                                <div className={page.info}>
                                    <h2 className={page.name}>{d.name}</h2>
                                    <p className={page.meta}>
                                        {formatDateVn(d.startDate)} – {formatDateVn(d.endDate)}
                                    </p>
                                    <p className={page.meta}>Áp cho: {m.roomsLabel(d)}</p>
                                </div>
                                <span className={`${styles.badge} ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>
                                <div className={page.actions}>
                                    {m.permissions.canUpdate && (
                                        <button type="button" className={controls.buttonGhost} onClick={() => m.startEdit(d)}>
                                            Sửa
                                        </button>
                                    )}
                                    {m.permissions.canUpdate && status !== "ended" && (
                                        <button type="button" className={controls.buttonGhost} onClick={() => m.toggleActive(d)}>
                                            {d.active ? "Tắt" : "Bật"}
                                        </button>
                                    )}
                                    {m.permissions.canDelete && (
                                        <button
                                            type="button"
                                            className={styles.dangerButton}
                                            onClick={() => m.remove(d)}
                                            aria-label={`Xoá ${d.name}`}
                                        >
                                            Xoá
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                    {list.totalPages > 1 && (
                        <div className={page.pager}>
                            <button
                                type="button"
                                className={controls.buttonGhost}
                                disabled={list.pageNo <= 1}
                                onClick={() => list.setPageNo(list.pageNo - 1)}
                            >
                                Trước
                            </button>
                            <span>
                                Trang {list.pageNo}/{list.totalPages}
                            </span>
                            <button
                                type="button"
                                className={controls.buttonGhost}
                                disabled={list.pageNo >= list.totalPages}
                                onClick={() => list.setPageNo(list.pageNo + 1)}
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </section>

                {formState.showForm && (
                    <div className={styles.splitSide}>
                        <DiscountForm
                            form={formState.form}
                            onChange={formState.setForm}
                            scopeAll={formState.scopeAll}
                            onScopeAllChange={formState.setScopeAll}
                            editingId={formState.editingId}
                            canPickHotel={false}
                            hotels={m.hotels}
                            onHotelChange={m.changeFormHotel}
                            rooms={formState.rooms}
                            error={formState.error}
                            saving={formState.saving}
                            onSubmit={m.submit}
                            onCancel={m.closeForm}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
