"use client";

import { unwrapResponse } from "@/lib/hotels/envelope";
import {
    getProvinceById,
    getWardsByProvince,
    provinces as localProvinces,
    type Province,
    type Ward,
} from "@/data/locations.data";

// Danh sách tỉnh / xã cho ô tìm kiếm lấy từ backend:
//   GET /api/v1/provinces                 -> [{ id, name }] các tỉnh
//   GET /api/v1/wards/provinces/{id}      -> [{ id, name }] các xã của tỉnh {id}
// (qua proxy /api/public). Bộ lọc khách sạn + URL dùng MÃ (provinceId/wardId).
// Vẫn nhận dạng cũ chỉ có tên (string[]) để tương thích. Backend seed từ cùng file
// vn-provinces-wards.json với FE (StartupRunner) nên tên khớp 1-1 -> ghép tên
// về bản ghi cục bộ để lấy mã + toạ độ tâm tỉnh. /provinces giờ trả
// { id, name } -> dùng thẳng id; tỉnh ngoài file VN (vd. "US-CA" California)
// vẫn được giữ, chỉ thiếu toạ độ tâm. Mục chỉ có tên mà không ghép được thì
// bỏ (không có mã thì không lọc được).

type NameOrItem = string | { id?: string | number; name?: string };

const PROVINCE_PREFIXES = ["Thành phố ", "Tỉnh "];
const WARD_PREFIXES = ["Phường ", "Xã ", "Thị trấn ", "Đặc khu "];

function normalize(name: string, prefixes: string[]): string {
    let n = name.normalize("NFC").trim();
    for (const p of prefixes) {
        if (n.startsWith(p)) {
            n = n.slice(p.length);
            break;
        }
    }
    return n.toLocaleLowerCase("vi");
}

function itemName(item: NameOrItem): string {
    return typeof item === "string" ? item : (item.name ?? "");
}

function itemId(item: NameOrItem): string | null {
    return typeof item === "string" || item.id == null ? null : String(item.id);
}

async function getList(path: string): Promise<NameOrItem[]> {
    const res = await fetch(`/api/public/${path}`, { method: "GET" });
    const data = await unwrapResponse<NameOrItem[] | null>(res);
    return Array.isArray(data) ? data : [];
}

// Cache theo phiên trang — danh mục hành chính gần như không đổi, mở lại
// dropdown / đổi qua lại giữa các tỉnh không gọi API lại.
let provincesPromise: Promise<Province[]> | null = null;
const wardsPromises = new Map<string, Promise<Ward[]>>();

export function fetchProvinces(): Promise<Province[]> {
    provincesPromise ??= getList("provinces")
        .then((items) => {
            const byName = new Map(localProvinces.map((p) => [normalize(p.name, PROVINCE_PREFIXES), p]));
            return items.flatMap((item) => {
                const id = itemId(item);
                const name = itemName(item);
                const match = (id && getProvinceById(id)) || byName.get(normalize(name, PROVINCE_PREFIXES));
                // Tên hiển thị theo backend, mã + toạ độ theo bản ghi cục bộ.
                if (match) return [{ ...match, name: name || match.name }];
                if (!id || !name) return [];
                // Ngoài file VN: không có toạ độ tâm -> NaN (bản đồ không bay tới).
                return [{ id, name, fullName: name, lat: NaN, lng: NaN }];
            });
        })
        .catch((err) => {
            provincesPromise = null; // lỗi thì lần sau thử lại
            throw err;
        });
    return provincesPromise;
}

export function fetchWards(provinceId: string): Promise<Ward[]> {
    let promise = wardsPromises.get(provinceId);
    if (!promise) {
        promise = getList(`wards/provinces/${encodeURIComponent(provinceId)}`)
            .then((items) => {
                const local = getWardsByProvince(provinceId);
                const byId = new Map(local.map((w) => [w.id, w]));
                const byName = new Map(local.map((w) => [normalize(w.name, WARD_PREFIXES), w]));
                return items.flatMap((item) => {
                    const id = itemId(item);
                    const name = itemName(item);
                    const match = (id && byId.get(id)) || byName.get(normalize(name, WARD_PREFIXES));
                    if (match) return [{ ...match, name: name || match.name }];
                    return id && name ? [{ id, provinceId, name, fullName: name }] : [];
                });
            })
            .catch((err) => {
                wardsPromises.delete(provinceId);
                throw err;
            });
        wardsPromises.set(provinceId, promise);
    }
    return promise;
}
