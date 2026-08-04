import React from 'react';
import { Shield, FileText, Scale, ArrowLeft } from 'lucide-react';

interface LegalPageProps { type: 'terms' | 'privacy' | 'legal'; }

const UPDATED = new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

export default function LegalPage({ type }: LegalPageProps) {
  React.useEffect(() => {
    document.documentElement.classList.add('dark');
    document.title = type === 'terms' ? 'Terms & Conditions — Velox Space' : type === 'privacy' ? 'Privacy Policy — Velox Space' : 'Legal — Velox Space';
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-10 border-b px-6 py-4 flex items-center justify-between" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer" style={{ color: 'var(--muted)' }}>
            <ArrowLeft size={14}/> Back to Velox Space
          </a>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-black">V</div>
          <span className="font-black text-sm" style={{ color: 'var(--text)' }}>Velox Space</span>
        </div>
        <div className="flex gap-3 text-xs font-semibold">
          <a href="/terms" style={{ color: type === 'terms' ? 'var(--primary)' : 'var(--muted)' }}>Terms</a>
          <a href="/privacy" style={{ color: type === 'privacy' ? 'var(--primary)' : 'var(--muted)' }}>Privacy</a>
          <a href="/legal" style={{ color: type === 'legal' ? 'var(--primary)' : 'var(--muted)' }}>Legal</a>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 gradient-primary">
            {type === 'terms' ? <FileText size={22} className="text-white"/> : type === 'privacy' ? <Shield size={22} className="text-white"/> : <Scale size={22} className="text-white"/>}
          </div>
          <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text)' }}>
            {type === 'terms' ? 'Terms & Conditions' : type === 'privacy' ? 'Privacy Policy' : 'Legal Notice'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Last updated: {UPDATED} · Velox Space Technologies</p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text-soft)' }}>

          {type === 'terms' && <>
            <Section title="1. Agreement to Terms">
              By accessing or using Velox Space ("Platform", "Service", "we", "us"), you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree with any part of these terms, you may not access the Service. These Terms apply to all users, including visitors, customers, and contributors.
            </Section>
            <Section title="2. Description of Service">
              Velox Space is a cloud-based digital marketing and social media analytics platform. It enables users to connect social media accounts, monitor analytics, track advertising campaigns, schedule and publish content, generate AI-powered captions, discover business leads, manage client workspaces, and generate performance reports. Features and availability vary by subscription plan.
            </Section>
            <Section title="3. User Accounts">
              You must be at least 18 years old to create an account. You are responsible for maintaining the security and confidentiality of your login credentials. You agree to provide accurate, current, and complete information during registration and to update it as needed. You are responsible for all activities under your account. Notify us immediately at security@veloxspace.io of any unauthorised use.
            </Section>
            <Section title="4. Subscription Plans and Payment">
              Velox Space offers three plans: Starter (free or low cost), Pro, and Agency. Paid subscriptions are billed in advance on a monthly or annual basis. All payments are processed via Paystack or Flutterwave. Prices are displayed in USD but may be charged in local currency equivalent. We reserve the right to change pricing with 30 days' written notice. Subscriptions renew automatically unless cancelled before the renewal date. Refunds are not provided for partial billing periods. Annual subscribers who cancel within 14 days of initial purchase may request a full refund.
            </Section>
            <Section title="5. Third-Party Account Connections">
              You may connect your social media and advertising platform accounts (including Meta, Google, TikTok, LinkedIn, and others) to Velox Space. By doing so, you authorise Velox Space to access, read, and display data from those platforms in accordance with their respective terms of service. You must have the legal right and authority to connect those accounts. We never request write access beyond what is required for the features you use, and we never store your social media passwords.
            </Section>
            <Section title="6. AI-Generated Content">
              Velox Space uses artificial intelligence (Groq AI) to generate captions, insights, and recommendations. AI-generated content is provided for informational and creative assistance purposes only. You are solely responsible for reviewing, editing, and approving any AI-generated content before publishing. Velox Space makes no warranties regarding the accuracy, completeness, or suitability of AI-generated output.
            </Section>
            <Section title="7. Acceptable Use">
              You agree not to use Velox Space to: engage in spam, harassment, or illegal activity; violate any applicable laws or regulations; infringe upon any third-party intellectual property rights; attempt to gain unauthorised access to our systems or other users' accounts; distribute malware or harmful code; or engage in any activity that could damage, disable, or impair the Platform. We reserve the right to suspend or permanently terminate accounts that violate these policies.
            </Section>
            <Section title="8. Intellectual Property">
              All content, features, logos, code, designs, and functionality of Velox Space are owned by Velox Space Technologies and are protected by copyright, trademark, and other applicable intellectual property laws. You may not copy, reproduce, modify, distribute, or create derivative works from any part of the Platform without our prior written permission. You retain ownership of any content you create and publish through the Platform.
            </Section>
            <Section title="9. Data and Analytics">
              Analytics and campaign data displayed in Velox Space is sourced from third-party platforms via their APIs. We do not guarantee the accuracy of third-party data. Historical data may be subject to the data retention limits of those platforms.
            </Section>
            <Section title="10. Disclaimer of Warranties">
              Velox Space is provided on an "as is" and "as available" basis without any warranty, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or meet your specific requirements. We disclaim all warranties, including but not limited to fitness for a particular purpose, merchantability, and non-infringement.
            </Section>
            <Section title="11. Limitation of Liability">
              To the maximum extent permitted by applicable law, Velox Space shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of revenue, data, or business opportunity, even if we have been advised of the possibility of such damages. Our total cumulative liability to you shall not exceed the greater of (a) the total fees paid by you in the three months preceding the claim, or (b) USD $100.
            </Section>
            <Section title="12. Termination">
              We may suspend or terminate your access to Velox Space at any time, with or without notice, for any reason including breach of these Terms. Upon termination, your right to access the Platform ceases immediately. Provisions that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitation of liability.
            </Section>
            <Section title="13. Governing Law">
              These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria. Any disputes arising under or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Lagos, Nigeria, unless otherwise required by local law.
            </Section>
            <Section title="14. Changes to Terms">
              We reserve the right to modify these Terms at any time. We will notify you of significant changes by email or via an in-app notification at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the updated Terms.
            </Section>
            <Section title="15. Contact">
              <p>For questions about these Terms, contact us at:</p>
              <p className="mt-2"><strong>Email:</strong> legal@veloxspace.io</p>
              <p><strong>Address:</strong> Velox Space Technologies, Lagos, Nigeria</p>
            </Section>
          </>}

          {type === 'privacy' && <>
            <Section title="1. Introduction">
              Velox Space Technologies ("Velox Space", "we", "us", "our") is committed to protecting your personal information. This Privacy Policy explains what data we collect, how we use it, who we share it with, and your rights regarding your personal data. This Policy applies to all users of the Velox Space platform.
            </Section>
            <Section title="2. Information We Collect">
              <strong>Account Information:</strong> Name, email address, country, and password hash when you register.
              <br/><br/>
              <strong>Profile Information:</strong> Profile photo, job role, and workspace name if you choose to provide them.
              <br/><br/>
              <strong>Social Platform Data:</strong> When you connect a social media or advertising account, we access analytics data (follower counts, reach, impressions, engagement, campaign spend) from those platforms via their official APIs. We never access private messages, contact lists, or personal data of your followers beyond what is explicitly shown in your analytics dashboard.
              <br/><br/>
              <strong>Usage Data:</strong> IP address, browser type, device type, pages visited, features used, and session timestamps, collected automatically through server logs.
              <br/><br/>
              <strong>Payment Data:</strong> Payment transactions are processed entirely by Paystack or Flutterwave. Velox Space never stores your card number, bank account details, or CVV. We only receive transaction confirmation and payment status.
              <br/><br/>
              <strong>Support Communications:</strong> Messages you send via our in-app chat, email, or contact form.
            </Section>
            <Section title="3. How We Use Your Information">
              We use your information to: provide and improve the Velox Space platform; authenticate your identity and maintain session security; process subscription payments; generate AI-powered insights and captions personalised to your connected accounts; send service notifications, invoices, and product updates; respond to support requests; detect and prevent fraud and unauthorised access; comply with legal obligations; and improve platform features based on usage patterns.
            </Section>
            <Section title="4. Legal Basis for Processing (GDPR)">
              For users in the European Economic Area, we process your data under the following legal bases: contract performance (to provide the services you subscribed to); legitimate interests (to improve the platform and prevent fraud); consent (for marketing communications, which you can withdraw at any time); and legal obligation (to comply with applicable laws).
            </Section>
            <Section title="5. Data Storage and Security">
              Your data is stored using Supabase, a secure cloud database infrastructure hosted in the European Union. We implement industry-standard security measures including: encryption of data at rest and in transit (TLS 1.3); bcrypt hashing of all passwords; server-side validation and authorisation on all API routes; regular security reviews; and access controls that limit employee access to user data on a need-to-know basis. OAuth access tokens from connected social platforms are stored encrypted. Despite these measures, no system is 100% secure, and we cannot guarantee absolute security.
            </Section>
            <Section title="6. Third-Party Services">
              Velox Space integrates with and shares necessary data with the following third-party services:
              <br/><br/>
              • <strong>Meta (Facebook/Instagram)</strong> — For social analytics and content publishing. Governed by Meta's Privacy Policy.
              <br/>
              • <strong>Google</strong> — For YouTube analytics and Google Analytics 4 data. Governed by Google's Privacy Policy.
              <br/>
              • <strong>TikTok</strong> — For TikTok analytics data. Governed by TikTok's Privacy Policy.
              <br/>
              • <strong>LinkedIn</strong> — For LinkedIn page analytics. Governed by LinkedIn's Privacy Policy.
              <br/>
              • <strong>Paystack / Flutterwave</strong> — For payment processing. Governed by their respective Privacy Policies.
              <br/>
              • <strong>Groq AI (Llama 3)</strong> — For AI caption generation. Prompts are processed by Groq's servers.
              <br/>
              • <strong>Vercel</strong> — Hosting infrastructure for the Velox Space application.
              <br/><br/>
              We only share the minimum data necessary for each integration to function.
            </Section>
            <Section title="7. Cookies and Tracking">
              Velox Space uses session cookies solely to maintain your authenticated login state. We do not use advertising cookies, tracking pixels, or cross-site tracking technologies. We do not use Google Analytics or any third-party tracking on our own marketing website.
            </Section>
            <Section title="8. Data Retention">
              We retain your personal data for as long as your account is active. Analytics data is retained for up to 12 months. Support chat messages are retained for 24 months. When you delete your account, all personally identifiable data is permanently removed within 30 days, except where retention is required by applicable law (e.g., transaction records for tax purposes, which are retained for 7 years).
            </Section>
            <Section title="9. Your Rights">
              You have the following rights regarding your personal data:
              <br/><br/>
              • <strong>Access:</strong> Request a copy of the data we hold about you.
              <br/>
              • <strong>Correction:</strong> Request correction of inaccurate data.
              <br/>
              • <strong>Deletion:</strong> Request deletion of your data ("right to be forgotten").
              <br/>
              • <strong>Portability:</strong> Request your data in a machine-readable format.
              <br/>
              • <strong>Restriction:</strong> Request restriction of certain processing activities.
              <br/>
              • <strong>Objection:</strong> Object to processing based on legitimate interests.
              <br/>
              • <strong>Withdraw Consent:</strong> Withdraw consent for marketing communications at any time.
              <br/><br/>
              To exercise any of these rights, email privacy@veloxspace.io. We will respond within 30 days.
            </Section>
            <Section title="10. Children's Privacy">
              Velox Space is not directed at or intended for use by individuals under the age of 18. We do not knowingly collect personal data from minors. If we become aware that a minor has provided us with personal data, we will delete it promptly.
            </Section>
            <Section title="11. International Data Transfers">
              Velox Space is based in Nigeria but uses infrastructure and services (Supabase, Vercel, Google, Meta) that may process data in other jurisdictions including the EU and US. We ensure appropriate safeguards are in place for any international transfers in compliance with applicable data protection laws.
            </Section>
            <Section title="12. Changes to this Policy">
              We may update this Privacy Policy from time to time. We will notify you of material changes by email or via an in-app notification at least 14 days before they take effect. The updated Policy will be available at veloxspace.online/privacy.
            </Section>
            <Section title="13. Contact">
              <p>For privacy questions, data requests, or to report a concern:</p>
              <p className="mt-2"><strong>Email:</strong> privacy@veloxspace.io</p>
              <p><strong>Data Controller:</strong> Velox Space Technologies, Lagos, Nigeria</p>
            </Section>
          </>}

          {type === 'legal' && <>
            <Section title="Company Information">
              <p><strong>Company Name:</strong> Velox Space Technologies</p>
              <p className="mt-1"><strong>Location:</strong> Lagos, Nigeria</p>
              <p className="mt-1"><strong>General Enquiries:</strong> hello@veloxspace.io</p>
              <p className="mt-1"><strong>Legal:</strong> legal@veloxspace.io</p>
              <p className="mt-1"><strong>Privacy:</strong> privacy@veloxspace.io</p>
              <p className="mt-1"><strong>Security:</strong> security@veloxspace.io</p>
            </Section>
            <Section title="Intellectual Property Notice">
              The Velox Space name, logo, platform design, source code, and all associated content are the exclusive property of Velox Space Technologies. All rights reserved. Unauthorised reproduction, distribution, or use of any Velox Space intellectual property is strictly prohibited and may result in legal action.
            </Section>
            <Section title="Third-Party Trademarks">
              All third-party brand names, logos, and trademarks referenced within Velox Space (including Meta, Facebook, Instagram, Google, TikTok, LinkedIn, YouTube, Paystack, and Flutterwave) are the property of their respective owners. Velox Space is not affiliated with, endorsed by, or sponsored by any of these companies unless explicitly stated.
            </Section>
            <Section title="Disclaimer">
              The information and analytics displayed on Velox Space are sourced from third-party platforms and are provided for informational purposes only. Velox Space Technologies makes no representations or warranties regarding the accuracy, completeness, or timeliness of data obtained from third-party APIs. Marketing insights, AI recommendations, and financial projections should not be relied upon as professional financial or legal advice.
            </Section>
            <Section title="Limitation of Liability">
              To the fullest extent permitted by Nigerian law and applicable international law, Velox Space Technologies shall not be held liable for any direct, indirect, incidental, consequential, or punitive damages arising from the use of or inability to use the Velox Space platform, including but not limited to loss of revenue, data loss, or business interruption.
            </Section>
            <Section title="Governing Law and Jurisdiction">
              These legal terms and any disputes arising from your use of Velox Space shall be governed by the laws of the Federal Republic of Nigeria. You consent to the exclusive jurisdiction of the courts of Lagos, Nigeria for the resolution of any disputes.
            </Section>
            <Section title="DMCA / Copyright Infringement">
              If you believe that content on Velox Space infringes your copyright, please send a written notice to legal@veloxspace.io including: identification of the copyrighted work; identification of the allegedly infringing material; your contact information; a statement that you have a good faith belief that use is not authorised; and your signature. We will investigate and respond within 14 business days.
            </Section>
            <Section title="Open Source Acknowledgements">
              Velox Space is built using open-source software including React, TypeScript, Tailwind CSS, Express.js, and Supabase. We are grateful to the open-source community. Respective licences apply to each component.
            </Section>
            <Section title="Changes to Legal Terms">
              We reserve the right to update this Legal Notice at any time. Changes take effect immediately upon posting. Continued use of Velox Space constitutes your acceptance of any updates.
            </Section>
          </>}

        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>© {new Date().getFullYear()} Velox Space Technologies. All rights reserved.</p>
          <div className="flex gap-4 text-xs font-semibold">
            <a href="/terms" style={{ color: 'var(--primary)' }}>Terms</a>
            <a href="/privacy" style={{ color: 'var(--primary)' }}>Privacy</a>
            <a href="/legal" style={{ color: 'var(--primary)' }}>Legal</a>
            <a href="/" style={{ color: 'var(--muted)' }}>Home</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text)' }}>{title}</h2>
      <div style={{ color: 'var(--text-soft)', lineHeight: 1.7 }}>{children}</div>
    </section>
  );
}
