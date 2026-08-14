declare global {
    interface Window {
        // Google Identity Services loaded at runtime via <script>, no official types published.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        google: any;
    }
}
export { };
