"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./login.module.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const googleClientRef = useRef<any>(null);
    const googleCallbackRef = useRef<any>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Vui lòng nhập đầy đủ email và mật khẩu");
            return;
        }

        console.log("Login with email:", { email, password });

    };
    useEffect(() => {

        const initFacebook = () => {
            if (!window.FB) {
                setTimeout(initFacebook, 500);
                return;
            }

            window.FB.init({
                appId: "2840631646312811",
                cookie: true,
                xfbml: true,
                version: "v23.0",
            });

            console.log("Facebook SDK Initialized");
        };

        initFacebook();

        const initGoogle = () => {
            if (!window.google) {
                setTimeout(initGoogle, 500);
                return;
            }

            googleClientRef.current = window.google.accounts.oauth2.initTokenClient({
                client_id: "654051365578-akou0ga1q1dh34o8a0oiqhvpu47b4fsj.apps.googleusercontent.com",
                scope: "profile email",
                callback: (response: any) => {
                    googleCallbackRef.current?.(response);
                },
                error_callback: (error: any) => {
                    console.log("Login Failed");
                    console.log(error);
                },
            });

            console.log("Google SDK Initialized");
        };

        initGoogle();
    }, []);

    const loginFacebook = () => {
        window.FB.login(
            function (response: any) {
                console.log(response);

                if (response.authResponse) {
                    console.log("Login Success");
                    console.log(response.authResponse.accessToken);
                    console.log(response.authResponse.userID);
                } else {
                    console.log("Login Failed");
                }
            },
            {
                scope: "public_profile",
            }
        );
    };

    const loginGoogle = () => {
        googleCallbackRef.current = (response: any) => {
            console.log(response);

            if (response.access_token) {
                console.log("Login Success");
                console.log(response.access_token);
            } else {
                console.log("Login Failed");
            }
        };

        googleClientRef.current?.requestAccessToken();
    };

    return (
        <div className={styles.page}>
            <div className={styles.panel}>
                <div className={styles.panelInner}>
                    <h2 className={styles.title}>Đăng nhập</h2>
                    <p className={styles.subtitle}>
                        Tiếp tục để khám phá phòng ở dạng toàn cảnh 360°
                    </p>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                className={styles.input}
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label} htmlFor="password">Mật khẩu</label>
                            <input
                                id="password"
                                type="password"
                                className={styles.input}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        {error && <p className={styles.error}>{error}</p>}

                        <button type="submit" className={styles.submitButton}>
                            Đăng nhập
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>hoặc</span>
                    </div>

                    <button className={styles.authButton} onClick={loginFacebook}>
                        Đăng nhập với Facebook
                    </button>
                    <button className={styles.authButton} onClick={loginGoogle}>
                        Đăng nhập với Google
                    </button>

                    <Link className={styles.mapLink} href="/map" style={{ marginTop: "1.5rem" }}>
                        Tiếp tục không cần đăng nhập →
                    </Link>
                </div>
            </div>
        </div>
    );
}