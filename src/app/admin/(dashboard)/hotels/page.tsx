"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import controls from "@/styles/controls.module.css";
import styles from "@/components/admin/adminPage.module.css";
import { useAdminAccess } from "@/components/admin/AdminAccessProvider";
import ProvinceWardSelect from "@/components/admin/ProvinceWardSelect";
import { AdminApiError } from "@/lib/admin/apiClient";
import { deleteHotel, listHotels } from "@/lib/admin/resources";
import type { Hotel } from "@/lib/admin/types";

export default function HotelsPage() {
    // Mẫu tham khảo cho việc ẩn/hiện NÚT theo quyền (khác với ẩn/hiện cả mục
    // nav ở AdminShell) — hiện chỉ gate ở mức module (không phân biệt được
    // quyền tạo/sửa/xoá riêng vì chưa xác nhận đúng tên quyền thật, xem ghi
    // chú ở AdminShell.tsx). Khi có tên quyền thật (vd. "HOTEL_CREATE",
    // "HOTEL_DELETE") thì đổi sang hasPermission(...) cho đúng từng nút.
    const { hasModule } = useAdminAccess();
    const canManageHotels = hasModule("HOTEL");
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [query, setQuery] = useState("");
    // Lọc theo tỉnh/phường-xã tái dùng ProvinceWardSelect (đã có sẵn ở form
    // tạo/sửa khách sạn) — chọn xong áp dụng ngay, không cần bấm "Tìm".
    const [provinceId, setProvinceId] = useState<number | null>(null);
    const [wardId, setWardId] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = () => {
        setLoading(true);
        listHotels({ page, size: 10, query, provinceId, wardId })
            .then((res) => {
                setHotels(res.result);
                setTotalPages(res.meta.totalPages || 1);
            })
            .catch((e) => setError(e instanceof AdminApiError ? e.message : "Không tải được danh sách"))
            .finally(() => setLoading(false));
    };

    useEffect(load, [page, provinceId, wardId]); // eslint-disable-line react-hooks/set-state-in-effect -- tải dữ liệu ban đầu từ API, một external system

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        load();
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Xoá khách sạn này? Toàn bộ phòng thuộc khách sạn cũng sẽ bị xoá.")) return;
        try {
            await deleteHotel(id);
            load();
        } catch (e) {
            setError(e instanceof AdminApiError ? e.message : "Xoá thất bại");
        }
    };

    return (
        <div>
            <div className={styles.pageHeader}>
                <div>
                    <h1 className={styles.pageTitle}>Khách sạn</h1>
                    <p className={styles.pageSubtitle}>Quản lý khách sạn — bấm vào một dòng để sửa và quản lý phòng.</p>
                </div>
                {canManageHotels && (
                    <Link href="/admin/hotels/new" className={controls.button}>
                        Thêm khách sạn
                    </Link>
                )}
            </div>

            <form className={styles.toolbar} onSubmit={handleSearchSubmit}>
                <div className={styles.toolbarLocation}>
                    <ProvinceWardSelect
                        wardId={wardId}
                        onChange={setWardId}
                        onProvinceChange={setProvinceId}
                    />
                </div>

                <input
                    className={`${controls.input} ${styles.searchInput}`}
                    placeholder="Tìm theo tên khách sạn..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit" className={controls.buttonGhost}>
                    Tìm
                </button>
            </form>

            {error && <p className={controls.error}>{error}</p>}

            <div className={styles.panel}>
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Tên</th>
                                <th>Địa chỉ</th>
                                <th>Phường/xã (tỉnh)</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {hotels.map((h) => (
                                <tr key={h.id}>
                                    <td>{h.id}</td>
                                    <td>{h.name}</td>
                                    <td>{h.address}</td>
                                    <td>
                                        {h.ward?.name} ({h.ward?.province?.name}) — ward #{h.ward?.id}
                                    </td>
                                    <td>
                                        <div className={styles.rowActions}>
                                            <Link href={`/admin/hotels/${h.id}`} className={styles.linkButton}>
                                                Sửa
                                            </Link>
                                            {canManageHotels && (
                                                <button type="button" className={styles.linkButtonDanger} onClick={() => handleDelete(h.id)}>
                                                    Xoá
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && hotels.length === 0 && <p className={styles.emptyState}>Không có khách sạn nào</p>}
                    {loading && <p className={styles.emptyState}>Đang tải...</p>}
                </div>
                <div className={styles.pagination}>
                    <button type="button" className={controls.buttonGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                        Trước
                    </button>
                    <span>
                        Trang {page}/{totalPages}
                    </span>
                    <button
                        type="button"
                        className={controls.buttonGhost}
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Sau
                    </button>
                </div>
            </div>
        </div>
    );
}
