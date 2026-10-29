import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, GOOGLE_PRIVACY_URL, YOUTUBE_TOS_URL } from "@/components/legal";

// 영문판. 한국어판(/privacy)과 내용이 같아야 한다 — 한쪽을 고치면 다른 쪽도 고친다.
export const metadata: Metadata = {
    title: "Privacy Policy",
    description: "Viral Hunter Privacy Policy — information we collect, cookies, and use of YouTube API Services",
    alternates: { canonical: "/privacy/en", languages: { ko: "/privacy", en: "/privacy/en" } },
};

const EFFECTIVE_DATE = "October 29, 2026";

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
                The Service has no sign-up or login, and we do not ask for your name or phone number. Only if you
                sign up for the report email do we receive the information described in section 2. If you email us
                ({CONTACT_EMAIL}), we keep your email address and message in our inbox in order to reply.
            </p>

            <h2 id="report-mail">2. Report email</h2>
            <ul>
                <li>
                    What we collect: your email address, the frequency you chose, and when you signed up, confirmed and
                    were sent an email, and the page where you signed up.
                </li>
                <li>Purpose: only to send the &ldquo;videos worth making now&rdquo; report and the confirmation email. We do not send advertising.</li>
                <li>
                    Retention: deleted immediately when you unsubscribe. Sign-ups that are not confirmed are deleted
                    automatically after 7 days.
                </li>
                <li>
                    Processors and transfers abroad: email addresses are stored in a database run by Supabase Inc.
                    (USA; server located in Mumbai, India), and emails are sent with Gmail by Google LLC (USA). Data is
                    sent over encrypted connections when you sign up and when an email is sent, and kept for the period
                    above.
                </li>
                <li>Your right to refuse: if you do not consent you cannot receive the report email, but you can still use the site.</li>
                <li>
                    Changing frequency or unsubscribing: any time, using the link at the bottom of every email or by
                    emailing us.
                </li>
            </ul>

            <h2>3. Analytics and cookies (Google Analytics)</h2>
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

            <h2>4. Server logs</h2>
            <p>
                The Service is hosted on Vercel. For reliable and secure operation, standard server logs (IP
                address, request time, browser information) may be kept temporarily by the hosting provider. We
                do not use these logs to identify users.
            </p>

            <h2>5. Use of YouTube API Services</h2>
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

            <h2>6. Sharing with third parties</h2>
            <p>
                We do not sell or share your personal information with third parties. Only Google (analytics and
                email delivery), Supabase (storing report email addresses) and Vercel (hosting), listed above,
                process information to operate the Service.
            </p>

            <h2>7. Contact</h2>
            <p>
                For privacy questions, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            </p>

            <h2>8. Changes</h2>
            <ul>
                <li>September 25, 2026: first published</li>
                <li>October 29, 2026: added the report email section (collecting email addresses)</li>
            </ul>
        </>
    );
}
