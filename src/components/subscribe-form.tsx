"use client";

import Link from "next/link";
import { useState } from "react";
import { Mail } from "lucide-react";
import { FREQUENCIES, FREQUENCY_LABEL, type Frequency } from "@/lib/ideas";
import { currentPageType, track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * 리포트 메일 신청 칸.
 *
 * 보내면 /api/subscribe 가 report_subscribe 함수로 '확인 전' 상태로 넣고, 파이프라인 PC 가
 * 매시간 확인 메일을 보낸다(utube_rank/report_mail.py). 확인 링크를 눌러야 리포트가 간다.
 * website 칸은 사람 눈에 안 보이는 봇 함정이다 — 채워져 오면 서버가 조용히 버린다.
 */
export function SubscribeForm({ source, className = "" }: { source: string; className?: string }) {
    const [email, setEmail] = useState("");
    const [frequency, setFrequency] = useState<Frequency>("weekly");
    const [consent, setConsent] = useState(false);
    const [website, setWebsite] = useState("");
    const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
    const [message, setMessage] = useState("");

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!consent) {
            setState("error");
            setMessage("개인정보 수집·이용에 동의해 주셔야 보낼 수 있어요.");
            return;
        }
        setState("sending");
        try {
            const res = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, frequency, consent, website, source }),
            });
            const body = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
            if (!res.ok || !body.ok) {
                setState("error");
                setMessage(body.message ?? "잠시 뒤 다시 시도해 주세요.");
                return;
            }
            track("report_subscribe", { page_type: currentPageType(), frequency });
            setState("done");
        } catch {
            setState("error");
            setMessage("연결이 원활하지 않아요. 잠시 뒤 다시 시도해 주세요.");
        }
    }

    if (state === "done") {
        return (
            <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-[14px] leading-relaxed text-emerald-900", className)}>
                <p className="font-semibold">신청됐어요. 확인 메일을 보내 드릴게요.</p>
                <p className="mt-1 text-[13px] text-emerald-800">
                    한 시간 안에 <strong>{email}</strong> 로 확인 메일이 가요. 메일 안의 &lsquo;구독 확인&rsquo;을 눌러야
                    리포트가 시작돼요. 보이지 않으면 스팸함도 확인해 주세요.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className={cn("rounded-2xl border border-neutral-200 bg-white p-5", className)}>
            <div className="mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4 text-neutral-500" />
                <p className="text-[15px] font-semibold text-neutral-900">리포트 메일로 받기</p>
            </div>
            <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
                지금 데이터로 고른 &lsquo;만들 만한 영상&rsquo;을 메일로 보내 드려요. 무료이고, 광고는 넣지 않아요.
            </p>

            <label htmlFor={`sub-email-${source}`} className="sr-only">이메일 주소</label>
            <input
                id={`sub-email-${source}`}
                type="email"
                required
                autoComplete="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mb-3 w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-[14px] outline-none focus:border-neutral-500"
            />

            <fieldset className="mb-3">
                <legend className="mb-1.5 text-[12px] font-medium text-neutral-600">받는 횟수</legend>
                <div className="flex flex-wrap gap-2">
                    {FREQUENCIES.map((f) => (
                        <label
                            key={f}
                            className={cn(
                                "cursor-pointer rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                                frequency === f
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-300 text-neutral-600 hover:border-neutral-500",
                            )}
                        >
                            <input
                                type="radio"
                                name={`sub-frequency-${source}`}
                                value={f}
                                checked={frequency === f}
                                onChange={() => setFrequency(f)}
                                className="sr-only"
                            />
                            {FREQUENCY_LABEL[f]}
                        </label>
                    ))}
                </div>
            </fieldset>

            {/* 봇 함정: 화면 밖으로 빼 두고 사람은 건드리지 않는다 */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                <label>
                    웹사이트
                    <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
            </div>

            <label className="mb-4 flex items-start gap-2 text-[12px] leading-relaxed text-neutral-600">
                <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                    (필수) 리포트 발송을 위해 이메일 주소를 수집·이용하는 데 동의해요. 구독을 해지하면 바로 지워져요.{" "}
                    <Link href="/privacy#report-mail" className="underline underline-offset-2">자세히</Link>
                </span>
            </label>

            {state === "error" && <p className="mb-3 text-[12px] text-red-600">{message}</p>}

            <button
                type="submit"
                disabled={state === "sending"}
                className="w-full rounded-full bg-neutral-900 px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {state === "sending" ? "보내는 중…" : "신청하기"}
            </button>
            <p className="mt-2 text-center text-[11px] text-neutral-400">
                받는 횟수는 메일 아래 링크로 언제든 바꾸거나 해지할 수 있어요.
            </p>
        </form>
    );
}
