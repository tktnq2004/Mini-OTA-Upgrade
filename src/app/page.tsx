"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Login() {
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

    return (
        <>
            <button onClick={loginFacebook}>
                Login with Facebook
            </button>
            <Link href="/map">
                Go to Map
            </Link>
        </>
    );
}