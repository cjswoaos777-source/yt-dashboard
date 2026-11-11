import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, Lightbulb } from "lucide-react";
import {
    getIdeas, watchUrl, fmtKr,
    type SmallByCategory, type SmallTopics, type SmallVideo,
} from "@/lib/ideas";
import { CATEGORY_META, CATEGORY_SLUGS } from "@/lib/categories";
import { SubscribeForm } from "@/components/subscribe-form";
import { MetricsDisclosure } from "@/components/legal";
import { SupportBox } from "@/components/support-box";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/*
 * [2026-11-03] 지금 만들 만한 영상 — 이름은 그대로 둔다(사용자 11-03).
 * 예전 주제 추천은 대형 채널 주제(YG·악뮤)가 많이 나와서, 같은 '주제(태그 묶음)' 방식을 작은 채널 영상만으로 다시 센다
 * (ideas_report.small_topics). 카테고리마다 작은 채널 여러 곳이 함께 터진 주제 3개와, 실제로 터진 영상을 보여 준다.
 * 그 칸이 없으면 작은 채널 터진 영상(small_by_category)을 보여 준다. 기준·주의 문구는 payload 에서 온다 — 메일과 같은 말.
 */

const DESCRIPTION =
    "구독자 10만 명이 안 되는 유튜브 채널 여러 곳이 최근 2일 동안 함께 터뜨린 주제를 카테고리마다 3개씩 매시간 골라요. " +
    "주제마다 실제로 터진 작은 채널 영상도 함께 보여 드려요.";

export const metadata: Metadata = {
    title: "지금 만들 만한 영상 — 작은 채널에서 터진 주제 카테고리별 정리",
    description: DESCRIPTION,
    alternates: { canonical: "/ideas" },
    openGraph: {
        title: "지금 만들 만한 영상 | Viral Hunter",
        description: DESCRIPTION,
        url: `${SITE.url}/ideas`,
        type: "website",
    },
};

// 유튜브 카테고리 영문 이름 → 우리 카테고리 순위 페이지 (없으면 null)
const CATEGORY_SLUG_BY_NAME = Object.fromEntries(
    CATEGORY_SLUGS.map((s) => [CATEGORY_META[s].category, s as string]),
) as Record<string, string>;

/** 메일 링크(#cat-영문키)와 같은 규칙 */
function anchorId(category: string) {
    return `cat-${category.toLowerCase().replace(/[^a-z]/g, "")}`;
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
                        alt={`${plainTitle(v.title)} 썸네일`}
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

function Jump({ items }: { items: { category: string; label: string; n: number }[] }) {
    return (
        <nav className="vh-sm-jump" aria-label="카테고리 바로 가기">
            {items.map((c) => (
                <a key={c.category} href={`#${anchorId(c.category)}`}>
                    {c.label} <span>{c.n.toLocaleString()}</span>
                </a>
            ))}
        </nav>
    );
}

function CategoryHead({ category, label }: { category: string; label: string }) {
    const slug = CATEGORY_SLUG_BY_NAME[category];
    return (
        <div className="vh-sec-head">
            <h2>{label}</h2>
            {slug && <Link href={`/category/${slug}`}>{label} 채널 순위 →</Link>}
        </div>
    );
}

function Footnotes({ note, rules }: { note: string; rules: string[] }) {
    return (
        <>
            <p className="vh-idea-tip">
                <Lightbulb aria-hidden="true" />
                <span>{note}</span>
            </p>
            <section className="vh-sec">
                <div className="vh-sec-title">
                    <h2>이렇게 골랐어요</h2>
                </div>
                <ul className="vh-bullets vh-bullets-sm">
                    {rules.map((x) => <li key={x}>{x}</li>)}
                </ul>
                <MetricsDisclosure />
            </section>
            <SupportBox />
        </>
    );
}

function TopicSections({ s }: { s: SmallTopics }) {
    return (
        <>
            <Jump items={s.sections.map((c) => ({ category: c.category, label: c.label, n: c.topics.length }))} />
            {s.sections.map((c, n) => (
                <div key={c.category} className="vh-sm-block">
                    <section id={anchorId(c.category)} className="vh-sec vh-sm-sec">
                        <CategoryHead category={c.category} label={c.label} />
                        <ol className="vh-ideas">
                            {c.topics.map((t, i) => (
                                <li key={t.topic} className="vh-idea">
                                    <div className="vh-idea-head">
                                        <span className="vh-idea-rk">{i + 1}</span>
                                        <h3>{t.headline}</h3>
                                        {t.badges.map((b) => (
                                            <span key={b} className="vh-idea-badge">{b}</span>
                                        ))}
                                    </div>
                                    <ul className="vh-bullets">
                                        {t.why.map((w) => <li key={w}>{w}</li>)}
                                    </ul>
                                    <p className="vh-idea-ex">작은 채널에서 터진 영상</p>
                                    <ul className="vh-ivlist">
                                        {t.examples.map((v) => <SmallLine key={v.video_id} v={v} />)}
                                    </ul>
                                </li>
                            ))}
                        </ol>
                    </section>
                    {/* 메일 신청은 세 번째 카테고리 뒤에 한 번 — 끝까지 내리지 않아도 보이게 */}
                    {n === 2 && <SubscribeForm source="ideas" className="vh-subform" />}
                </div>
            ))}
            {s.sections.length < 3 && <SubscribeForm source="ideas" className="vh-subform" />}
            <Footnotes note={s.note} rules={s.rules} />
        </>
    );
}

/** small_topics 가 없을 때만 쓴다 (작은 채널 터진 영상 카테고리별) */
function VideoSections({ s }: { s: SmallByCategory }) {
    return (
        <>
            <Jump items={s.sections.map((c) => ({ category: c.category, label: c.label, n: c.count }))} />
            {s.sections.map((c, n) => (
                <div key={c.category} className="vh-sm-block">
                    <section id={anchorId(c.category)} className="vh-sec vh-sm-sec">
                        <CategoryHead category={c.category} label={c.label} />
                        <p className="vh-sec-note">
                            작은 채널 영상 {c.count.toLocaleString()}개가 이틀 안에 터졌어요. 구독자 대비 많이 터진 순서예요.
                        </p>
                        <div className="vh-card">
                            <ul className="vh-ivlist">
                                {c.videos.map((v) => <SmallLine key={v.video_id} v={v} />)}
                            </ul>
                        </div>
                    </section>
                    {n === 2 && <SubscribeForm source="ideas" className="vh-subform" />}
                </div>
            ))}
            {s.sections.length < 3 && <SubscribeForm source="ideas" className="vh-subform" />}
            <Footnotes note={s.note} rules={s.rules} />
        </>
    );
}

export default async function IdeasPage() {
    const r = await getIdeas();
    const topics = r?.small_topics?.sections.length ? r.small_topics : null;
    const videos = !topics && r?.small_by_category?.sections.length ? r.small_by_category : null;

    return (
        <main className="vh-main vh-article">
            <Link href="/dashboard" className="vh-back">
                <ArrowLeft aria-hidden="true" />
                대시보드로
            </Link>

            <header className="vh-phead">
                <h1>지금 만들 만한 영상</h1>
                <p className="vh-lead">
                    {videos
                        ? "작은 채널에서 지금 터진 영상이에요. 구독자 10만 명이 안 되는 채널이 최근 2일 안에 올렸는데, 조회수가 구독자 수보다 훨씬 많이 나왔어요. 카테고리마다 3개씩 골랐어요."
                        : "작은 채널에서 지금 터진 주제예요. 구독자 10만 명이 안 되는 채널이 최근 2일 동안 올린 영상을 태그로 묶어, 여러 채널이 함께 터진 주제를 카테고리마다 골랐어요."}
                    {" "}매시간 바뀌어요.
                    {r && <> <span className="vh-lead-dim">({kstLabel(r.generated_at)} 기준)</span></>}
                </p>
            </header>

            {topics ? (
                <TopicSections s={topics} />
            ) : videos ? (
                <VideoSections s={videos} />
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
