/**
 * 데이터 출처 스위치.
 *
 * 지금 사이트는 GitHub 에 올라간 gzip JSON 을 읽는다. Supabase 로 옮기는 중이지만
 * 한 번에 갈아끼우지 않고, 이 스위치로 양쪽을 나란히 두고 검증한 뒤 넘어간다.
 *
 *   github   (기본)  기존 동작 그대로. 아무것도 바뀌지 않는다.
 *   supabase         Supabase 에서 읽는다.
 *
 * 전환/롤백은 Vercel 환경변수 하나로 한다. 코드 배포 없이 되돌릴 수 있어야
 * 문제가 생겼을 때 대응이 빠르다.
 *
 *   NEXT_PUBLIC_DATA_SOURCE=supabase
 *
 * NEXT_PUBLIC_ 접두사인 이유: 대시보드와 벤치마킹이 클라이언트 컴포넌트라
 * 브라우저에서도 이 값을 읽어야 한다. 값 자체는 비밀이 아니다.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * 왜 브라우저가 Supabase 를 직접 부르지 않는가
 *
 * 데이터는 1시간에 한 번만 바뀌므로 방문자마다 DB 를 볼 이유가 없다.
 * 브라우저가 직접 조회하면 DB 부하가 방문자 수에 비례하지만,
 * Vercel API Route 를 한 겹 두고 캐시하면 방문자가 몇 명이든 DB 조회 횟수가
 * 같다. 과거 Supabase 를 쓰다 느려서 파일로 되돌린 원인 중 하나가
 * (인덱스 부재와 함께) 이 구조였다.
 */

export type DataSource = "github" | "supabase";

export const DATA_SOURCE: DataSource =
    process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "supabase" : "github";

export const isSupabase = DATA_SOURCE === "supabase";
