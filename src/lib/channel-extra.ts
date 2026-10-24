/**
 * 채널 고유 정보 문장 — 주제 태그·업로드 요일·영상 길이 (channel_extra).
 *
 * [2026-10-24] SEO 실험 ch-unique-2026-10 의 실험군에만 표시한다 (seo-experiment.ts).
 * 채널 분석 상자(channel-insight.ts)는 비교 문장이라 틀이 비슷했다(중복 검사 고유 2%).
 * 여기는 그 채널의 영상에서 나온 단어(태그)와 습관이라 채널마다 내용 자체가 다르다.
 */
import type { ChannelExtra } from "@/lib/channels";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

function duration(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분${s ? ` ${s}초` : ""}` : `${s}초`;
}

export function buildExtraView(e: ChannelExtra): { topics: string[]; sentences: string[] } {
    const sentences: string[] = [];
    const topics = (e.topics ?? []).map((t) => t.t);

    if (e.topics?.length) {
        const top = e.topics.slice(0, 3).map((t) => `#${t.t}(${t.n}편)`).join(", ");
        sentences.push(`최근 30일 이 채널 영상에 가장 자주 붙은 주제는 ${top}입니다.`);
    }

    const w = e.weekday ?? [];
    const total = w.reduce((a, b) => a + b, 0);
    if (total >= 4) {
        const max = Math.max(...w);
        const maxDay = w.indexOf(max);
        const weekend = (w[5] ?? 0) + (w[6] ?? 0);
        const activeDays = w.filter((x) => x > 0).length;
        if (max / total >= 0.4) {
            sentences.push(`포착된 영상 ${total}편 중 ${max}편이 ${DAYS[maxDay]}요일에 올라왔습니다. 업로드 요일이 뚜렷한 채널입니다.`);
        } else if (weekend / total >= 0.6) {
            sentences.push(`포착된 영상 ${total}편 중 ${weekend}편이 주말(토·일)에 올라온 주말 중심 채널입니다.`);
        } else if (activeDays >= 6) {
            sentences.push(`포착된 영상 ${total}편이 요일을 가리지 않고 고르게 올라왔습니다.`);
        } else {
            sentences.push(`요일별 업로드: ${DAYS.map((d, i) => `${d} ${w[i] ?? 0}`).join(" · ")} (포착 영상 ${total}편).`);
        }
    }

    if (e.long_n >= 2 && e.long_avg_sec) {
        const tail = e.long_avg_sec >= 1200 ? " 20분이 넘는 긴 영상 위주입니다." : e.long_avg_sec < 300 ? " 5분 안쪽의 짧은 롱폼 위주입니다." : "";
        sentences.push(`롱폼 ${e.long_n}편의 평균 길이는 ${duration(e.long_avg_sec)}입니다.${tail}`);
    }
    if (e.short_n >= 2 && e.short_avg_sec) {
        sentences.push(`숏츠 ${e.short_n}편의 평균 길이는 ${duration(e.short_avg_sec)}입니다.`);
    }
    return { topics, sentences };
}
