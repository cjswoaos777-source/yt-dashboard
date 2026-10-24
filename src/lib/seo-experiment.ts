/**
 * SEO 대조군 실험 그룹 — 채널 페이지를 반으로 나눠 한쪽(treatment)만 바꾸고 비교한다.
 *
 * [2026-10-24] 실험 ch-unique-2026-10: 실험군에 채널 고유 정보(주제 태그·업로드 요일·영상 길이)를 더하고,
 * 모든 페이지에 똑같이 붙던 지표 설명은 /about/metrics 링크로 줄인다. 4주 뒤(11-21) 색인율·노출을 비교한다.
 *
 * 그룹 규칙은 utube_rank/seo_experiment.py 의 group_of() 와 반드시 같아야 한다:
 * channel_id 의 FNV-1a 32비트 해시가 짝수면 treatment.
 */
export const SEO_EXPERIMENT_ID = "ch-unique-2026-10";
/** 실험군 본문이 바뀐 날 (사이트맵 lastmod 에 반영) */
export const SEO_EXPERIMENT_START = "2026-10-24";

export function fnv1a(s: string): number {
    let h = 0x811c9dc5;
    for (const b of new TextEncoder().encode(s)) {
        h ^= b;
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

export function seoGroup(channelId: string): "treatment" | "control" {
    return fnv1a(channelId) % 2 === 0 ? "treatment" : "control";
}
