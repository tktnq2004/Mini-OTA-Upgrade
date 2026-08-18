declare global {
    interface Window {
        // Facebook SDK loaded at runtime via <script>, no official types published.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        FB: any;
    }
}

export {};
