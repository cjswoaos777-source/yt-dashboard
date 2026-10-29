"use client";

import Link from "next/link";
import { useState } from "react";
import { FREQUENCIES, FREQUENCY_LABEL, type Frequency } from "@/lib/ideas";
import { cn } from "@/lib/utils";

/** 리포트 메일 관리: 받는 횟수 바꾸기, 구독 해지(행을 바로 지운다). */
export function SubscribeManage({
    token,
    email,
    frequency: initial,
    pending,
}: {
    token: string;
    email: string;
    frequency: Frequency;
    pending: boolean;
}) {
    const [frequency, setFrequency] = useState<Frequency>(initial);
    const [saved, setSaved] = useState<Frequency>(initial);
    const [state, setState] = useState<"idle" | "saving" | "saved" | "confirm" | "gone" | "error">("idle");

    async function call(action: "frequency" | "unsubscribe") {
        setState("saving");
        try {
            const res = await fetch("/api/subscribe/manage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ t: token, action, frequency }),
            });
            const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
            if (!res.ok || !body.ok) throw new Error();
            if (action === "unsubscribe") {
                setState("gone");
            } else {
                setSaved(frequency);
                setState("saved");
            }
        } catch {
            setState("error");
        }
    }

    if (state === "gone") {
        return (
            <div className="text-[14px] leading-relaxed text-neutral-600">
                <p className="mb-6">구독을 해지했어요. 이메일 주소도 바로 지웠어요. 그동안 읽어 주셔서 고마워요.</p>
                <Link href="/ideas" className="rounded-full border border-neutral-300 px-4 py-2 text-[13px] text-neutral-700">
                    사이트에서 계속 보기
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 text-[14px] text-neutral-700">
            <p>
                받는 주소: <strong>{email}</strong>
                {pending && <span className="ml-2 text-[12px] text-amber-600">(아직 구독 확인 전이에요 — 확인 메일의 버튼을 눌러 주세요)</span>}
            </p>

            <fieldset>
                <legend className="mb-2 text-[13px] font-medium">받는 횟수</legend>
                <div className="flex flex-wrap gap-2">
                    {FREQUENCIES.map((f) => (
                        <label
                            key={f}
                            className={cn(
                                "cursor-pointer rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                                frequency === f ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-600",
                            )}
                        >
                            <input type="radio" name="frequency" value={f} checked={frequency === f} onChange={() => setFrequency(f)} className="sr-only" />
                            {FREQUENCY_LABEL[f]}
                        </label>
                    ))}
                </div>
                <button
                    type="button"
                    disabled={frequency === saved || state === "saving"}
                    onClick={() => call("frequency")}
                    className="mt-3 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40"
                >
                    저장
                </button>
                {state === "saved" && <span className="ml-3 text-[12px] text-emerald-700">저장했어요.</span>}
            </fieldset>

            <div className="border-t border-neutral-200 pt-6">
                {state === "confirm" ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px]">정말 해지할까요? 주소가 바로 지워져요.</span>
                        <button type="button" onClick={() => call("unsubscribe")} className="rounded-full bg-red-600 px-4 py-2 text-[13px] font-medium text-white">
                            해지
                        </button>
                        <button type="button" onClick={() => setState("idle")} className="rounded-full border border-neutral-300 px-4 py-2 text-[13px]">
                            취소
                        </button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setState("confirm")} className="text-[13px] text-neutral-500 underline underline-offset-2">
                        구독 해지
                    </button>
                )}
            </div>
            {state === "error" && <p className="text-[12px] text-red-600">잠시 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요.</p>}
        </div>
    );
}
