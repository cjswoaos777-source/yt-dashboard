import Image from "next/image";
import type { RankingRow } from "@/lib/supabase";

/*
 * 서버에서 그리는 순위 부품 (홈·채널 등). 순위 화면(/dashboard)은 필터 때문에 클라이언트 쪽
 * DashboardClient 의 RankRow 를 쓰고, 모양(vh.css)은 같다.
 */

export const CATEGORY_KO: Record<string, string> = {
    "Autos & Vehicles": "자동차",
    Comedy: "코미디",
    Education: "교육",
    Entertainment: "엔터테인먼트",
    "Film & Animation": "영화·애니",
    Gaming: "게임",
    "Howto & Style": "노하우·스타일",
    Music: "음악",
    "News & Politics": "뉴스·정치",
    "Nonprofits & Activism": "비영리·사회",
    "People & Blogs": "인물·블로그",
    "Pets & Animals": "동물",
    "Science & Technology": "과학·기술",
    Sports: "스포츠",
    "Travel & Events": "여행",
};
export const categoryKo = (c: string) => CATEGORY_KO[c] ?? c;

export function fmtKr(n: number): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
    if (n >= 10_000) return `${(n / 10_000).toFixed(1)}만`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}천`;
    return n.toLocaleString("ko-KR");
}

/** 숫자와 단위를 나눠 단위만 작게 그린다 */
export function Kr({ n, prefix = "", unit = "" }: { n: number; prefix?: string; unit?: string }) {
    const t = fmtKr(n);
    const m = t.match(/^([\d.,]+)(.*)$/);
    const u = (m ? m[2] : "") + unit;
    return (
        <>
            {prefix}
            {m ? m[1] : t}
            {u && <span className="vh-u">{u}</span>}
        </>
    );
}

/** "12.3만명"처럼 이미 만든 글에서 단위만 작게 그린다. 글자는 그대로다. */
export function Num({ t }: { t: string }) {
    const m = t.match(/^([+-]?[\d.,]+)(.*)$/);
    if (!m) return <>{t}</>;
    return (
        <>
            {m[1]}
            {m[2] && <span className="vh-u">{m[2]}</span>}
        </>
    );
}

const watch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
const thumb = (id: string, size: "mq" | "hq" = "mq") => `https://img.youtube.com/vi/${id}/${size}default.jpg`;
const isShorts = (r: RankingRow) => r.video_type?.startsWith("Shorts") ?? false;

/** 순위 한 줄 (서버용) */
export function RankRowStatic({ r, rank }: { r: RankingRow; rank: number }) {
    return (
        <li className="vh-row" data-top={rank <= 3 ? "" : undefined} data-wide={rank >= 100 ? "" : undefined}>
            <span className="vh-rk">{rank}</span>
            <a className="vh-th" href={watch(r.video_id)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
                <Image src={thumb(r.video_id)} alt="" fill sizes="(max-width: 640px) 96px, 128px" unoptimized />
                {isShorts(r) && <span className="vh-th-tag">쇼츠</span>}
            </a>
            <div className="vh-tt">
                <a className="vh-title" href={watch(r.video_id)} target="_blank" rel="noopener noreferrer">
                    {r.title}
                </a>
                <div className="vh-meta">
                    <b>{r.channel_title}</b>
                    <span>{isShorts(r) ? "쇼츠" : "롱폼"}</span>
                    {r.category_name && <span>{categoryKo(r.category_name)}</span>}
                </div>
            </div>
            <div className="vh-mv">
                <strong>
                    <Kr n={r.hourly_view_increase} prefix="+" />
                </strong>
                <small>최근 1시간 조회수</small>
            </div>
        </li>
    );
}

/** 1위 큰 카드 */
export function BigCard({ r }: { r: RankingRow }) {
    return (
        <article className="vh-big">
            <a className="vh-big-th" href={watch(r.video_id)} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
                <Image src={thumb(r.video_id, "hq")} alt="" fill sizes="(max-width: 960px) 100vw, 560px" unoptimized priority />
                <span className="vh-big-rk">1</span>
            </a>
            <div className="vh-big-body">
                <span className="vh-big-tag">
                    {isShorts(r) ? "쇼츠" : "롱폼"}
                    {r.category_name ? ` · ${categoryKo(r.category_name)}` : ""}
                </span>
                <a className="vh-big-title" href={watch(r.video_id)} target="_blank" rel="noopener noreferrer">
                    {r.title}
                </a>
                <span className="vh-meta">
                    <b>{r.channel_title}</b>
                    <span>총 {fmtKr(r.total_views)}회</span>
                </span>
                <div className="vh-big-num">
                    <strong>
                        <Kr n={r.hourly_view_increase} prefix="+" />
                    </strong>
                    <small>최근 1시간 조회수</small>
                </div>
            </div>
        </article>
    );
}
