import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

// 영문판. 한국어판(/privacy)과 내용이 같아야 한다 — 한쪽을 고치면 다른 쪽도 고친다.
export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Viral Hunter Privacy Policy — information we collect, cookies, and use of YouTube API Services",
    alternates: { canonical: "/privacy/en", languages: { ko: "/privacy", en: "/privacy/en" } },
};

const EFFECTIVE_DATE = "September 25, 2026";

export default function PrivacyEnPage() {
    return (
        <>
            <p className="text-[12px]"><Link href="/privacy">한국어</Link> · English</p>
            <h1>Privacy Policy</h1>
            <p className="text-neutral-500">Effective date: {EFFECTIVE_DATE}</p>

            <p>
                Viral Hunter (the &ldquo;Service&rdquo;, trend.readthe1stars.com) respects your privacy. This
                policy explains what information the Service handles and how.
            </p>

            <h2>1. Personal information we collect directly</h2>
            <p>
                The Service has no sign-up or login. We do not ask for or store your name, email address, phone
                number or any other information that identifies you. Only if you email us ({CONTACT_EMAIL}) do
                we keep your email address and message in our inbox in order to reply.
            </p>

            <h2>2. Analytics and cookies (Google Analytics)</h2>
            <p>
                We use Google Analytics 4 to understand how the Service is used. Google Analytics uses cookies to
                collect usage information that does not directly identify you, such as pages visited, time on
                page, referrer, device and browser type, and approximate location. This information is processed
                by Google.
            </p>
            <ul>
                <li>You can refuse cookies in your browser settings.</li>
                <li>
                    You can opt out of Google Analytics with the{" "}
                    <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
                        Google Analytics Opt-out Browser Add-on
                    </a>.
                </li>
            </ul>

            <h2>3. Server logs</h2>
            <p>
                The Service is hosted on Vercel. For reliable and secure operation, standard server logs (IP
                address, request time, browser information) may be kept temporarily by the hosting provider. We
                do not use these logs to identify users.
            </p>

            <h2>4. Use of YouTube API Services</h2>
            <p>
                The Service uses YouTube API Services to retrieve and display public YouTube video and channel
                information (titles, view counts, subscriber counts, etc.).
            </p>
            <ul>
                <li>
                    The Service does not access your YouTube or Google account and never asks you for any account
                    permission.
                </li>
                <li>
                    Data received from YouTube is stored only as long as needed to provide the Service and never
                    longer than 30 days; after that it is either refreshed from the API or deleted.
                </li>
                <li>
                    By using the Service you are also bound by the{" "}
                    <a href={YOUTUBE_TOS_URL} target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a>.
                    How YouTube and Google process data is described in the{" "}
                    <a href={GOOGLE_PRIVACY_URL} target="_blank" rel="noopener noreferrer">
                        Google Privacy Policy (http://www.google.com/policies/privacy)
                    </a>.
                </li>
            </ul>

            <h2>5. Sharing with third parties</h2>
            <p>
                We do not sell or share your personal information with third parties. Only Google (analytics) and
                Vercel (hosting), listed above, process information to operate the Service.
            </p>

            <h2>6. Contact</h2>
            <p>
                For privacy questions, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>

            <h2>7. Changes</h2>
            <ul>
                <li>{EFFECTIVE_DATE}: first published</li>
            </ul>
        </>
    );
}
