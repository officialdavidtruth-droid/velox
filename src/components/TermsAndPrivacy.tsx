import React from 'react';
import { X, Shield, FileText } from 'lucide-react';

interface Props { type: 'terms' | 'privacy'; onClose: () => void; }

export default function TermsAndPrivacy({ type, onClose }: Props) {
  const isTerms = type === 'terms';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ background: 'var(--card)', border: '1px solid var(--border)', maxHeight: '85vh' }}>
        <div className="px-6 py-4 flex items-center justify-between gradient-primary">
          <div className="flex items-center gap-2">
            {isTerms ? <FileText size={18} className="text-white"/> : <Shield size={18} className="text-white"/>}
            <h2 className="font-bold text-white">{isTerms ? 'Terms & Conditions' : 'Privacy Policy'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white"><X size={18}/></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-5 text-sm" style={{ color: 'var(--text-soft)' }}>
          {isTerms ? (
            <>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Last updated: {new Date().toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</p>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>1. Acceptance of Terms</h3><p className="leading-relaxed">By accessing or using Velox Space ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use the Platform. These terms constitute a legally binding agreement between you and Velox Space.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>2. Description of Service</h3><p className="leading-relaxed">Velox Space is a social media and digital marketing analytics platform that enables users to connect social media accounts, track ad campaign performance, manage content calendars, generate AI-powered captions, find business leads, and analyse website traffic.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>3. Account Registration</h3><p className="leading-relaxed">You must provide accurate, complete, and current information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities that occur under your account. You must notify us immediately of any unauthorised use of your account.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>4. Subscription Plans & Billing</h3><p className="leading-relaxed">Velox Space offers Starter, Pro, and Agency subscription plans. Subscriptions are billed monthly or annually. You may upgrade or downgrade your plan at any time. Refunds are not provided for partial billing periods. We reserve the right to modify pricing with 30 days' notice.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>5. Connected Third-Party Accounts</h3><p className="leading-relaxed">By connecting social media or ad platform accounts, you authorise Velox Space to access data from those platforms in accordance with their respective terms of service. You are responsible for ensuring you have the right to connect those accounts. We do not store your social media passwords.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>6. Acceptable Use</h3><p className="leading-relaxed">You agree not to use the Platform to engage in spamming, harassment, illegal activity, or any use that violates third-party platform policies. We reserve the right to suspend or terminate accounts that violate these terms without refund.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>7. Intellectual Property</h3><p className="leading-relaxed">All content, features, and functionality of Velox Space are owned by Velox Space and protected by copyright, trademark, and other intellectual property laws. You may not copy, reproduce, or distribute any part of the Platform without our prior written consent.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>8. Limitation of Liability</h3><p className="leading-relaxed">Velox Space is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including data loss, revenue loss, or business interruption.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>9. Governing Law</h3><p className="leading-relaxed">These terms shall be governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved through binding arbitration in Lagos, Nigeria.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>10. Contact</h3><p className="leading-relaxed">For questions about these Terms, contact us at legal@veloxspace.io</p></section>
            </>
          ) : (
            <>
              <p className="text-[10px]" style={{ color: 'var(--muted)' }}>Last updated: {new Date().toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'})}</p>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>1. Information We Collect</h3><p className="leading-relaxed">We collect information you provide directly (name, email, password), information from connected social/ad platforms (analytics data, campaign metrics, post performance), and automatically collected information (IP address, browser type, usage patterns, and device information).</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>2. How We Use Your Information</h3><p className="leading-relaxed">We use your information to provide and improve the Platform, process payments, send service communications, generate AI-powered insights and captions, and ensure platform security. We do not sell your personal data to third parties.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>3. Data Storage & Security</h3><p className="leading-relaxed">Your data is stored securely using Supabase infrastructure with encryption at rest and in transit. Access tokens from connected platforms are encrypted server-side. We implement industry-standard security measures to protect against unauthorised access.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>4. Third-Party Services</h3><p className="leading-relaxed">Velox Space integrates with Meta (Facebook/Instagram), Google, TikTok, LinkedIn, and ad platforms. Each integration is governed by that platform's privacy policy. We only request minimum necessary permissions to provide the analytics features.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>5. Cookies</h3><p className="leading-relaxed">We use session cookies to maintain your login state. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, though this may affect Platform functionality.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>6. Your Rights</h3><p className="leading-relaxed">You have the right to access, correct, or delete your personal data at any time. You can export your data from your account settings. To request complete data deletion, contact privacy@veloxspace.io and we will process your request within 30 days.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>7. Data Retention</h3><p className="leading-relaxed">We retain your data for as long as your account is active. Analytics data is retained for 12 months. Upon account deletion, your personal data is permanently removed within 30 days, except where retention is required by law.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>8. Children's Privacy</h3><p className="leading-relaxed">Velox Space is not intended for users under 18 years of age. We do not knowingly collect personal information from minors.</p></section>
              <section><h3 className="font-bold text-base mb-2" style={{ color: 'var(--text)' }}>9. Contact</h3><p className="leading-relaxed">For privacy-related questions or data requests, contact privacy@veloxspace.io</p></section>
            </>
          )}
        </div>
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary">Got it</button>
        </div>
      </div>
    </div>
  );
}
