import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { getIdeas, watchUrl, fmtKr, type IdeaReport, type IdeaVideo, type CategoryStat } from "@/lib/ideas";
import { CATEGORY_META, CATEGORY_SLUGS } from "@/lib/categories";
import { SubscribeForm } from "@/components/subscribe-form";
import { MetricsDisclosure } from "@/components/legal";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const DESCRIPTION =
    "최근 2일 안에 올라온 국내 유튜브 영상의 시간당 조회수 증가를 매시간 분석해, 지금 만들면 좋은 주제와 형식을 골라 드려요. " +
    "작은 채널도 터진 주제, 영상은 많은데 반응은 평범한 주제, 피해야 할 주제까지 함께 봐요.";

export const metadata: Metadata = {
    title: "지금 만들 만한 영상 — 실시간 데이터로 고른 유튜브 주제",
    description: DESCRIPTION,
    alternates: { canonical: "/ideas" },
    openGraph: {
        title: "지금 만들 만한 영상 | Viral Hunter",
        description: DESCRIPTION,
        url: `${SITE.url}/ideas`,
        type: "website",
    },
};

// 카테고리 영문 이름 → 한글·카테고리 순위 페이지
const CATEGORY_BY_NAME = Object.fromEntries(
    CATEGORY_SLUGS.map((s) => [CATEGORY_META[s].category, { label: CATEGORY_META[s].label, slug: s as string | null }]),
) as Record<string, { label: string; slug: string | null }>;
const EXTRA_CATEGORY: Record<string, string> = {
    "Science & Technology": "과학·기술",
    "Autos & Vehicles": "자동차",
    "Nonprofits & Activism": "비영리·사회",
};
function categoryLabel(name: string) {
    return CATEGORY_BY_NAME[name] ?? { label: EXTRA_CATEGORY[name] ?? name, slug: null };
}

function kstLabel(iso: string) {
    return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric" });
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
    return (
        <section className="mt-12">
            <h2 className="mb-1 text-[18px] font-bold text-[#1A1A1A]">{title}</h2>
            {sub && <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">{sub}</p>}
            {children}
        </section>
    );
}

function VideoLine({ v }: { v: IdeaVideo }) {
    return (
        <li className="py-2">
            <a href={watchUrl(v)} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-neutral-900 hover:underline">
                {v.title}
            </a>
            <div className="mt-0.5 text-[12px] text-neutral-500">
                <Link href={`/channel/${v.channel_id}`} className="hover:underline">{v.channel_title}</Link>
                {" · "}구독자 {fmtKr(v.subscribers)} · 조회 {fmtKr(v.views)} · 시간당 +{fmtKr(v.hourly)}
                {v.is_shorts ? " · 숏츠" : " · 롱폼"}
            </div>
        </li>
    );
}

function CategoryList({ rows }: { rows: CategoryStat[] }) {
    return (
        <ul className="space-y-1 text-[13px] text-neutral-700">
            {rows.map((c) => {
                const m = categoryLabel(c.category);
                return (
                    <li key={c.category}>
                        {m.slug ? <Link href={`/category/${m.slug}`} className="hover:underline">{m.label}</Link> : m.label}
                        <span className="text-neutral-400"> · 한 편 시간당 +{fmtKr(c.median_hourly)} · {c.videos.toLocaleString()}개</span>
                    </li>
                );
            })}
        </ul>
    );
}

function Report({ r }: { r: IdeaReport }) {
    const s = r.formats.shorts;
    const l = r.formats.long;
    const ratio = l.median_hourly ? s.median_hourly / l.median_hourly : null;
    return (
        <>
            <ol className="space-y-4">
                {r.ideas.map((i, n) => (
                    <li key={i.topic} className="rounded-2xl border border-neutral-200 bg-white p-5">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-semibold text-neutral-400">{n + 1}</span>
                            <h2 className="text-[17px] font-bold text-[#1A1A1A]">{i.headline}</h2>
                            {i.badges.map((b) => (
                                <span key={b} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{b}</span>
                            ))}
                        </div>
                        <ul className="mb-3 list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-neutral-700">
                            {i.why.map((w) => <li key={w}>{w}</li>)}
                        </ul>
                        <p className="mb-3 flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[13px] leading-relaxed text-amber-900">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{i.tip}</span>
                        </p>
                        {i.title_words.length > 0 && (
                            <p className="mb-2 text-[12px] text-neutral-500">
                                잘 된 영상 제목에 자주 나온 말: {i.title_words.map((w) => `‘${w}’`).join(", ")}
                            </p>
                        )}
                        <p className="text-[12px] font-medium text-neutral-400">잘 되고 있는 영상</p>
                        <ul className="divide-y divide-neutral-100">
                            {i.examples.map((v) => <VideoLine key={v.video_id} v={v} />)}
                        </ul>
                    </li>
                ))}
            </ol>

            <SubscribeForm source="ideas" className="mt-8" />

            {r.small_hits.length > 0 && (
                <Section title="구독자 1만 미만 채널의 대박 영상" sub={r.small_hits_note}>
                    <ul className="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 bg-white px-5">
                        {r.small_hits.map((v) => <VideoLine key={v.video_id} v={v} />)}
                    </ul>
                </Section>
            )}

            <Section
                title="지금 잘 되는 형식"
                sub={ratio ? (ratio >= 1
                    ? `지금은 숏츠가 롱폼보다 한 편당 시간당 조회수가 ${ratio.toFixed(1)}배 빨리 올라요.`
                    : `지금은 롱폼이 숏츠보다 한 편당 시간당 조회수가 ${(1 / ratio).toFixed(1)}배 빨리 올라요.`) : undefined}
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    {([["숏츠", s, r.formats.best_categories.shorts], ["롱폼", l, r.formats.best_categories.long]] as const).map(([name, f, cats]) => (
                        <div key={name} className="rounded-2xl border border-neutral-200 bg-white p-5">
                            <p className="text-[15px] font-semibold">{name}</p>
                            <p className="mb-3 text-[12px] text-neutral-500">
                                {f.videos.toLocaleString()}개 · 한 편 시간당 +{fmtKr(f.median_hourly)} · 조회 중간값 {fmtKr(f.median_views)}
                            </p>
                            <p className="mb-1 text-[12px] font-medium text-neutral-400">한 편당 잘 오르는 분야</p>
                            <CategoryList rows={cats} />
                        </div>
                    ))}
                </div>
            </Section>

            {r.broad.length > 0 && (
                <Section title="큰 흐름" sub="분야가 넓어 '무엇을 만들지'로 고르진 않았지만, 지금 가장 활발한 분야예요.">
                    <div className="flex flex-wrap gap-2">
                        {r.broad.map((t) => (
                            <span key={t.topic} className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-700">
                                #{t.topic} <span className="text-neutral-400">채널 {t.channels}곳</span>
                            </span>
                        ))}
                    </div>
                </Section>
            )}

            {r.crowded.length > 0 && (
                <Section title="영상은 많은데 반응은 평범한 주제" sub="많은 채널이 올리고 있지만 한 편당 시간당 조회수는 평균보다 낮아요. 들어가려면 확실한 차별점이 필요해요.">
                    <ul className="space-y-1 text-[13px] text-neutral-700">
                        {r.crowded.map((t) => (
                            <li key={t.topic}>
                                #{t.topic} <span className="text-neutral-400">· 채널 {t.channels}곳 이상 · 한 편 시간당 +{fmtKr(t.median_hourly)}</span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}

            <Section title="피할 것">
                <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-neutral-700">
                    {r.avoid.map((a) => <li key={a.topic}><strong>#{a.topic}</strong> — {a.reason}</li>)}
                    <li>뉴스·정치, 사건사고 주제는 추천하지 않아요. 조회수가 높아도 채널에 오래 남는 위험이 커요.</li>
                    <li>예시 영상 중에도 방송 장면을 쓴 영상이 섞일 수 있어요. 형식(첫 장면, 제목, 길이)만 참고하고 남의 영상을 그대로 쓰지 마세요.</li>
                </ul>
            </Section>

            <Section title="이렇게 골랐어요">
                <ul className="list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-neutral-600">
                    {r.rules.map((x) => <li key={x}>{x}</li>)}
                </ul>
                <MetricsDisclosure className="mt-3" />
            </Section>
        </>
    );
}

export default async function IdeasPage() {
    const r = await getIdeas();

    return (
        <div className="min-h-screen bg-[#FDFDFC]">
            <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-10">
                <Link
                    href="/dashboard"
                    className="mb-8 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-neutral-600 transition-all hover:border-neutral-300 hover:bg-neutral-50"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    대시보드로
                </Link>

                <header className="mb-8">
                    <h1
                        className="mb-2 font-serif text-3xl font-bold leading-tight tracking-tight text-[#1A1A1A] md:text-4xl"
                        style={{ fontFamily: "var(--font-playfair), serif" }}
                    >
                        지금 만들 만한 영상
                    </h1>
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                        최근 2일 동안 올라온 국내 영상
                        {r && <strong className="font-semibold text-neutral-700"> {r.sample.videos.toLocaleString()}개</strong>}의
                        지금 반응(시간당 조회수 증가)을 보고, 만들어 볼 만한 주제와 형식을 골랐어요. 매시간 새로 바뀌어요.
                        {r && <> <span className="text-neutral-400">({kstLabel(r.generated_at)} 기준)</span></>}
                    </p>
                </header>

                {r ? (
                    <Report r={r} />
                ) : (
                    <>
                        <p className="mb-6 text-[14px] text-neutral-600">리포트를 준비하고 있어요. 잠시 뒤 다시 와 주세요.</p>
                        <SubscribeForm source="ideas-empty" />
                    </>
                )}

                <nav className="mt-12 flex flex-wrap gap-2 text-[13px]">
                    <Link href="/dashboard" className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-neutral-700 hover:bg-neutral-50">실시간 순위</Link>
                    <Link href="/report" className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-neutral-700 hover:bg-neutral-50">주간 리포트</Link>
                    <Link href="/tier/micro" className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-neutral-700 hover:bg-neutral-50">작은 채널 급상승</Link>
                </nav>
            </main>
        </div>
    );
}
