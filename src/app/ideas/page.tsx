import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { getIdeas, watchUrl, fmtKr, type SmallByCategory, type SmallSection, type SmallVideo } from "@/lib/ideas";
import { CATEGORY_META, CATEGORY_SLUGS } from "@/lib/categories";
import { SubscribeForm } from "@/components/subscribe-form";
import { MetricsDisclosure } from "@/components/legal";
import { SupportBox } from "@/components/support-box";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/*
 * [2026-11-03] 작은 채널에서 지금 터진 영상 (카테고리별 3개).
 * 주제 추천은 대형 채널 주제(YG·악뮤)가 많이 나와서, 사용자 결정으로 작은 채널 영상만 카테고리별로 보여 준다.
 * 고르는 기준·주의 문구는 파이프라인(ideas_report.small_by_category)이 payload 에 같이 넣는다 — 메일과 같은 말.
 */

const DESCRIPTION =
    "구독자 10만 명이 안 되는 유튜브 채널이 최근 2일 안에 올려 크게 터진 영상을 카테고리마다 3개씩 매시간 골라요. " +
    "게임·엔터테인먼트·교육·동물 등 분야별로, 조회수가 구독자의 몇 배인지 함께 보여 드려요.";

export const metadata: Metadata = {
    title: "작은 채널에서 지금 터진 영상 — 카테고리별 실시간 정리",
    description: DESCRIPTION,
    alternates: { canonical: "/ideas" },
    openGraph: {
        title: "작은 채널에서 지금 터진 영상 | Viral Hunter",
        description: DESCRIPTION,
        url: `${SITE.url}/ideas`,
        type: "website",
    },
};

// 유튜브 카테고리 영문 이름 → 우리 카테고리 순위 페이지 (없으면 null)
const CATEGORY_SLUG_BY_NAME = Object.fromEntries(
    CATEGORY_SLUGS.map((s) => [CATEGORY_META[s].category, s as string]),
) as Record<string, string>;

function anchorId(s: SmallSection) {
    return `cat-${s.category.toLowerCase().replace(/[^a-z]/g, "")}`;
}

function kstLabel(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric" });
}

/** 해시태그를 떼면 제목이 훨씬 읽기 쉽다. 다 떼면 비는 제목은 그대로 둔다. */
function plainTitle(t: string) {
    const s = t.replace(/\s*#\S+/g, "").trim();
    return s || t;
}

function SmallLine({ v }: { v: SmallVideo }) {
    return (
        <li className="vh-iv">
            <a href={watchUrl(v)} target="_blank" rel="noopener noreferrer" className="vh-iv-a">
                <span className="vh-vt-th">
                    <Image
                        src={`https://img.youtube.com/vi/${v.video_id}/mqdefault.jpg`}
                        alt=""
                        fill
                        sizes="96px"
                        unoptimized
                    />
                </span>
                <span className="vh-iv-t">{plainTitle(v.title)}</span>
            </a>
            <p className="vh-sm-why">
                구독자 {fmtKr(v.subscribers)}명 채널인데 조회 <strong>{fmtKr(v.views)}회</strong>
                {" · "}구독자의 <strong>{v.ratio.toLocaleString()}배</strong>
            </p>
            <div className="vh-iv-m">
                {/* 작은 채널은 우리 상세 페이지가 없는 경우가 많아 유튜브 채널로 보낸다 */}
                <a href={`https://www.youtube.com/channel/${v.channel_id}`} target="_blank" rel="noopener noreferrer">
                    {v.channel_title}
                </a>
                {v.is_shorts ? " · 숏츠" : " · 롱폼"}
            </div>
        </li>
    );
}

function Sections({ s }: { s: SmallByCategory }) {
    return (
        <>
            <nav className="vh-sm-jump" aria-label="카테고리 바로 가기">
                {s.sections.map((c) => (
                    <a key={c.category} href={`#${anchorId(c)}`}>
                        {c.label} <span>{c.count.toLocaleString()}</span>
                    </a>
                ))}
            </nav>

            {s.sections.map((c, n) => {
                const slug = CATEGORY_SLUG_BY_NAME[c.category];
                return (
                    <div key={c.category} className="vh-sm-block">
                        <section id={anchorId(c)} className="vh-sec vh-sm-sec">
                            <div className="vh-sec-head">
                                <h2>{c.label}</h2>
                                {slug && <Link href={`/category/${slug}`}>{c.label} 채널 순위 →</Link>}
                            </div>
                            <p className="vh-sec-note">
                                작은 채널 영상 {c.count.toLocaleString()}개가 이틀 안에 터졌어요. 구독자 대비 많이 터진 순서예요.
                            </p>
                            <div className="vh-card">
                                <ul className="vh-ivlist">
                                    {c.videos.map((v) => <SmallLine key={v.video_id} v={v} />)}
                                </ul>
                            </div>
                        </section>
                        {/* 메일 신청은 세 번째 카테고리 뒤에 한 번 — 끝까지 내리지 않아도 보이게 */}
                        {n === 2 && <SubscribeForm source="ideas" className="vh-subform" />}
                    </div>
                );
            })}
            {s.sections.length < 3 && <SubscribeForm source="ideas" className="vh-subform" />}

            <p className="vh-idea-tip">
                <Lightbulb aria-hidden="true" />
                <span>{s.note}</span>
            </p>

            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>이렇게 골랐어요</h2>
                </div>
                <ul className="vh-bullets vh-bullets-sm">
                    {s.rules.map((x) => <li key={x}>{x}</li>)}
                </ul>
                <MetricsDisclosure />
            </section>
            <SupportBox />
        </>
    );
}

export default async function IdeasPage() {
    const r = await getIdeas();
    const s = r?.small_by_category;

    return (
        <main className="vh-main vh-article">
            <Link href="/dashboard" className="vh-back">
                <ArrowLeft aria-hidden="true" />
                대시보드로
            </Link>

            <header className="vh-phead">
                <h1>작은 채널에서 지금 터진 영상</h1>
                <p className="vh-lead">
                    구독자 10만 명이 안 되는 채널이 최근 2일 안에 올렸는데, 조회수가 구독자 수보다 훨씬 많이 나온 영상이에요.
                    카테고리마다 3개씩 골랐고 매시간 바뀌어요.
                    {r && <> <span className="vh-lead-dim">({kstLabel(r.generated_at)} 기준)</span></>}
                </p>
            </header>

            {s && s.sections.length > 0 ? (
                <Sections s={s} />
            ) : (
                <>
                    <p className="vh-note">리포트를 준비하고 있어요. 잠시 뒤 다시 와 주세요.</p>
                    <SubscribeForm source="ideas-empty" className="vh-subform" />
                </>
            )}

            <nav className="vh-linkrow">
                <Link href="/dashboard">실시간 순위</Link>
                <Link href="/category">카테고리별 순위</Link>
                <Link href="/report">주간 리포트</Link>
            </nav>
        </main>
    );
}
