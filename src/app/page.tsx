"use client";

import Link from "next/link";

export default function Home() {
    return (
        <>
            <Link href="/login">
                Login
            </Link>
            <Link href="/map">
                Go to Map
            </Link>
        </>
    );
}