"use client";

import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import DiscountForm from "@/components/discounts/DiscountForm";
import DiscountTable from "@/components/discounts/DiscountTable";
import page from "@/components/discounts/discounts.module.css";
import { useDiscountManager } from "@/components/discounts/useDiscountManager";

export default function DiscountsPage() {
    const m = useDiscountManager();
    const { list, formState } = m;

    if (m.accessError) {
        return <p className={controls.error}>{m.accessError}</p>;
    }

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Khuyến mãi</h1>
                    <p className={styles.pageSubtitle}>
                        Tag giảm giá hiện trên phòng và được trừ thẳng vào tiền đặt phòng, tính theo từng đêm ở.
                    </p>
                </div>
                {m.permissions.canCreate && (
                    <button type="button" className={controls.button} onClick={m.openCreate} disabled={!m.ready}>
                        Tạo khuyến mãi
                    </button>
                )}
            </div>

            <form className={styles.toolbar} onSubmit={list.search}>
                <input
                    className={`${controls.input} ${styles.searchInput}`}
                    placeholder="Tìm theo tên tag..."
                    value={list.query}
                    onChange={(e) => list.setQuery(e.target.value)}
                />
                <button type="submit" className={controls.buttonGhost}>
                    Tìm
                </button>
                {m.ready &&
                    (m.isSuperAdmin ? (
                        <select
                            className={controls.select}
                            style={{ width: "auto" }}
                            value={m.filterHotelId ?? ""}
                            onChange={(e) => m.changeFilterHotel(e.target.value ? Number(e.target.value) : null)}
                            aria-label="Lọc theo khách sạn"
                        >
                            <option value="">Tất cả khách sạn</option>
                            {m.hotels.map((h) => (
                                <option key={h.id} value={h.id}>
                                    {h.name}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className={page.scopeNote}>
                            Khách sạn: {m.hotels[0]?.name ?? (m.myHotelId ? `#${m.myHotelId}` : "—")}
                        </span>
                    ))}
            </form>

            {formState.showForm && (
                <DiscountForm
                    form={formState.form}
                    onChange={formState.setForm}
                    scopeAll={formState.scopeAll}
                    onScopeAllChange={formState.setScopeAll}
                    editingId={formState.editingId}
                    canPickHotel={m.isSuperAdmin}
                    hotels={m.hotels}
                    onHotelChange={m.changeFormHotel}
                    rooms={formState.rooms}
                    error={formState.error}
                    saving={formState.saving}
                    onSubmit={m.submit}
                    onCancel={m.closeForm}
                />
            )}

            <DiscountTable
                discounts={list.discounts}
                today={m.today}
                loading={list.loading}
                error={list.error}
                showHotel={m.isSuperAdmin}
                hotelName={m.hotelName}
                roomsLabel={m.roomsLabel}
                canUpdate={m.permissions.canUpdate}
                canDelete={m.permissions.canDelete}
                onEdit={m.startEdit}
                onToggleActive={m.toggleActive}
                onDelete={m.remove}
                pageNo={list.pageNo}
                totalPages={list.totalPages}
                onPageChange={list.setPageNo}
            />
        </div>
    );
}
