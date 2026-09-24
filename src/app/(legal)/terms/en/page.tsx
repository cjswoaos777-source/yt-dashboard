import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

// 영문판. 한국어판(/terms)과 내용이 같아야 한다 — 한쪽을 고치면 다른 쪽도 고친다.
export const metadata: Metadata = {
    title: "Terms of Service",
    description: "Viral Hunter Terms of Service — use of YouTube API Services, our own metrics, limitation of liability",
    alternates: { canonical: "/terms/en", languages: { ko: "/terms", en: "/terms/en" } },
};

const EFFECTIVE_DATE = "September 25, 2026";

export default function TermsEnPage() {
    return (
        <>
            <p className="text-[12px]"><Link href="/terms">한국어</Link> · English</p>
            <h1>Terms of Service</h1>
            <p className="text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>

            <h2>1. About the Service</h2>
            <p>
                Viral Hunter (trend.readthe1stars.com, the &ldquo;Service&rdquo;) is a free information service
                that collects public YouTube video and channel information and shows how fast views are growing.
                The Service is not affiliated with, or endorsed by, YouTube or Google.
            </p>

            <h2>2. YouTube Terms of Service</h2>
            <p>
                The Service uses YouTube API Services.{" "}
                <strong>
                    By using the Service, you agree to be bound by the{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a>.
                </strong>{" "}
                For how YouTube data is processed, see the{" "}
                <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>; for
                how this Service handles information, see our <Link href="/privacy/en">Privacy Policy</Link>.
            </p>

            <h2>3. Metrics calculated by the Service</h2>
            <p>
                Rankings, hourly increases in views/likes/comments, subscriber tiers, channel growth indicators and
                insight statistics are calculated by the Service from public data received through YouTube API
                Services. <strong>These metrics are not provided or endorsed by YouTube</strong> and may differ from
                actual values depending on when and how the data was collected.
            </p>

            <h2>4. Restrictions</h2>
            <ul>
                <li>Do not scrape the Service in bulk by automated means, and do not resell or redistribute its information.</li>
                <li>Do not send excessive requests that interfere with the operation of the Service.</li>
            </ul>

            <h2>5. Limitation of liability</h2>
            <p>
                Information is provided &ldquo;as is&rdquo;, without any guarantee of accuracy, completeness or
                timeliness. The Service is not responsible for decisions you make based on its information. The
                Service may change or stop without prior notice.
            </p>

            <h2>6. Content rights</h2>
            <p>
                Rights to YouTube content such as video titles, thumbnails and channel names belong to their
                creators and YouTube. If you are a rights holder and want us to stop displaying something, contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>

            <h2>7. Changes and contact</h2>
            <p>
                When these terms change, we post them on this page with a new effective date. Contact:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>
        </>
    );
}
