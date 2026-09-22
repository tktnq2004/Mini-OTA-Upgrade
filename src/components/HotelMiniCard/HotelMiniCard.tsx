"use client";

import Link from "next/link";
import { BuildingsIcon, MapPinIcon } from "@phosphor-icons/react";
import ImageWithFallback from "@/components/ImageWithFallback/ImageWithFallback";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatVnd } from "@/lib/format";
import styles from "./HotelMiniCard.module.css";

interface HotelMiniCardProps {
  id: number;
  name: string;
  image: string;
  address: string;
  // null = khách sạn chưa có room nào (chưa có giá tính được) — ẩn hẳn dòng giá, cùng quy ước
  // "ẩn badge giá khi null" đã dùng ở marker bản đồ (xem Hotel.averagePrice).
  averagePrice: number | null;
}

// Thẻ khách sạn gọn, cả thẻ là 1 link — dùng cho các dải gợi ý ở trang chủ (giá tốt, cao cấp,
// đã xem gần đây). Khác <HotelCard/> ở trang /hotels (có khoảng cách + nút "Đặt phòng" riêng,
// gắn với luồng lọc theo GPS) — ở trang chủ chưa có ngữ cảnh tìm kiếm nào nên chỉ cần dẫn thẳng
// tới trang khách sạn.
export default function HotelMiniCard({ id, name, image, address, averagePrice }: HotelMiniCardProps) {
  const { t } = useLanguage();

  return (
    <Link href={`/hotel/${id}`} className={styles.card}>
      <div className={styles.thumbWrap}>
        <ImageWithFallback
          src={image}
          alt={name}
          className={styles.thumb}
          fallbackClassName={styles.thumbFallback}
          fallback={<BuildingsIcon size={22} weight="light" />}
        />
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.address}>
          <MapPinIcon size={12} />
          <span>{address}</span>
        </p>
        {averagePrice !== null && (
          <p className={styles.price}>
            {/* averagePrice là AVG() các phòng nên có thể lẻ đồng (vd. 1.135.384,62 đ) — làm tròn
                trước khi hiện, cùng tinh thần "chỉ cần gần đúng" đã áp dụng ở formatCompactVnd
                cho đúng field này trên marker bản đồ. */}
            <strong>{formatVnd(Math.round(averagePrice))}</strong>
            <span>{t("room.perNight")}</span>
          </p>
        )}
      </div>
    </Link>
  );
}
