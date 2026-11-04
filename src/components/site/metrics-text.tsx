"use client";

import { useUiLang } from "@/lib/i18n";

/** 자체 계산 지표 고지 글 (YouTube API 정책 III.E.4.h). 영어를 고른 사람에게도 같은 내용을 보여 준다. */
export function MetricsDisclosureText() {
    const { uiLang } = useUiLang();
    if (uiLang === "en") {
        return (
            <>
                Rankings, hourly growth, subscriber tiers and growth metrics are{" "}
                <strong className="font-semibold text-neutral-500">our own calculations</strong> based on public data
                Viral Hunter receives through the YouTube API Services. They are not provided or endorsed by YouTube.
            </>
        );
    }
    return (
        <>
            순위·시간당 증가량·구독자 구간·성장 지표는 Viral Hunter가 YouTube API
            서비스로 받은 공개 데이터를 바탕으로 <strong className="font-semibold text-neutral-500">자체 계산한 지표</strong>이며,
            YouTube가 제공하거나 보증하는 수치가 아닙니다.
        </>
    );
}
