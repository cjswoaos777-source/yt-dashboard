/**
 * 이름 뒤에 붙는 조사를 받침에 맞게 고른다.
 * '은(는)', '이(가)' 처럼 둘 다 적으면 기계가 쓴 글처럼 보여서 만들었다.
 *
 * - 한글로 끝나면 받침을 보고 고른다. (침착맨 → 침착맨은, 슈카월드 → 슈카월드는)
 * - 숫자로 끝나면 읽는 소리의 받침을 본다. (채널1 → 채널1은, 채널2 → 채널2는)
 * - 영어·기호처럼 읽는 법을 알 수 없으면 ' 채널'을 붙여서 피한다. (TWS → TWS 채널은)
 */
type JosaPair = "은는" | "이가";

const WITH_BATCHIM: Record<JosaPair, string> = { 은는: "은", 이가: "이" };
const WITHOUT_BATCHIM: Record<JosaPair, string> = { 은는: "는", 이가: "가" };

// 0 영, 1 일, 3 삼, 6 육, 7 칠, 8 팔 은 받침으로 끝난다.
const DIGIT_HAS_BATCHIM = new Set(["0", "1", "3", "6", "7", "8"]);

/** 받침이 있으면 true, 없으면 false, 알 수 없으면 null */
function endsWithBatchim(name: string): boolean | null {
    const last = name.trim().slice(-1);
    if (!last) return null;
    const code = last.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
    if (last >= "0" && last <= "9") return DIGIT_HAS_BATCHIM.has(last);
    return null;
}

export function withJosa(name: string, pair: JosaPair): string {
    const trimmed = name.trim();
    const batchim = endsWithBatchim(trimmed);
    if (batchim === null) return `${trimmed} 채널${WITH_BATCHIM[pair]}`;
    return trimmed + (batchim ? WITH_BATCHIM[pair] : WITHOUT_BATCHIM[pair]);
}
