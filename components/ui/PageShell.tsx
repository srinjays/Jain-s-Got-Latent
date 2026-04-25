"use client";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

interface Tab { label: string; href: string; }

export default function PageShell({
    children,
    tabs,
    hideLogo,
}: {
    children: React.ReactNode;
    tabs?: Tab[];
    hideLogo?: boolean;
}) {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <div style={{ minHeight: "100vh", position: "relative" }}>

            {/* ── Stage backdrop: blurred curtain folds ── */}
            <div className="curtain-bg" />
            <div className="curtain-blur-overlay" />
            <div className="curtain-wings" />

            {/* ── Logo top-left — larger, Y-axis spin ─── */}
            {!hideLogo && (
                <div
                    className="logo-wrap"
                    style={{ position: "fixed", top: "60px", left: "20px", zIndex: 50 }}
                    onClick={() => router.push("/")}
                >
                    <Image
                        src="/jgl-logo.png"
                        alt="Jain's Got Latent"
                        width={160}
                        height={160}
                        className="logo"
                        style={{ objectFit: "contain" }}
                        priority
                    />
                </div>
            )}

            {/* ── Page content ─────────────────────────── */}
            <div style={{ position: "relative", zIndex: 1 }}>
                {children}
            </div>

            {/* ── Bottom nav ───────────────────────────── */}
            {tabs && tabs.length > 0 && (
                <div style={{
                    position: "fixed", bottom: "22px",
                    left: "50%", transform: "translateX(-50%)",
                    zIndex: 50,
                }}>
                    <div className="card nav-bar">
                        {tabs.map((t) => (
                            <button
                                key={t.href}
                                className={`btn${pathname === t.href ? " active" : ""}`}
                                onClick={() => router.push(t.href)}
                                style={{ minWidth: "72px" }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
