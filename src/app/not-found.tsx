import Link from "next/link";

/*
 * 없는 주소(404). [2026-10-30] 새 디자인과 함께 만들었다.
 * 전에는 Next 기본 화면(영어 "This page could not be found.")이 떴다.
 * 순위에서 빠져 지워진 채널·카테고리 주소로 들어온 사람이 갈 곳을 고를 수 있게 대표 화면을 걸어 둔다.
 */
export default function NotFound() {
    return (
        <main className="vh-main vh-small">
            <p className="vh-eyebrow">404</p>
            <h1>페이지를 찾을 수 없어요</h1>
            <p className="vh-lead">
                주소가 바뀌었거나 없어진 페이지예요. 아래에서 지금 뜨는 영상과 채널을 바로 볼 수 있어요.
            </p>
            <div className="vh-about-btns">
                <Link href="/dashboard" className="vh-cta">
                    지금 뜨는 영상 보기
                </Link>
                <Link href="/channel" className="vh-btn-line">
                    떠오르는 채널
                </Link>
                <Link href="/" className="vh-btn-line">
                    처음으로
                </Link>
            </div>
        </main>
    );
}
