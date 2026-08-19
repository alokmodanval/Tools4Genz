import React from 'react';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';

const PrivacyPage: React.FC = () => (
  <>
    <SEO title="Privacy Policy - Tools4Genz" description="How Tools4Genz handles information used for requests, purchases, payments, and delivery." />
    <main className="py-16"><Container><article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
      <h1>Privacy Policy</h1><p><strong>Last updated: 19 August 2026</strong></p>
      <p>Tools4Genz collects only the information needed to respond to service requests, process purchases, verify payments, provide digital delivery, and support purchase recovery.</p>
      <h2>Information we process</h2><p>This may include your name, email address, optional phone number, request details, order and payment identifiers, and security records needed to prevent abuse. Card, bank, and UPI credentials are handled by Razorpay and are not stored by Tools4Genz.</p>
      <h2>How information is used</h2><p>We use it to fulfil your request or purchase, reconcile payment events, authorize private downloads, send transactional purchase messages when email delivery is configured, and investigate support or security issues.</p>
      <h2>Storage and sharing</h2><p>Application records are stored using Cloudflare services. Private project files are not exposed as a public bucket. Information is shared with service providers only as needed to operate the platform, including Cloudflare, Razorpay, and an email provider when enabled.</p>
      <h2>Advertising and affiliate recommendations</h2><p>If advertising is enabled, third-party advertising providers may use cookies, local storage, or other identifiers as permitted by your consent choices and applicable rules. Ads may be personalized or non-personalized depending on consent and provider configuration. Advertising remains disabled until the required provider configuration is completed. If you follow a clearly labelled affiliate recommendation, Tools4Genz records the trusted offer identifier and may earn a commission; we do not store the destination URL or its query values in click analytics.</p>
      <h2>Consent management</h2><p>Where required, advertising consent will be handled through an externally configured consent-management provider. The site does not claim that a homemade banner provides regulatory certification. Provider availability and choices may vary by region.</p>
      <h2>Retention and choices</h2><p>Records are retained as reasonably needed for delivery, accounting, fraud prevention, and support. You may contact us to ask about your information. Some records may need to be retained where required for legitimate operational or legal reasons.</p>
      <h2>Contact</h2><p>Use the <a href="/contact">contact form</a> for privacy questions or requests.</p>
    </article></Container></main>
  </>
);
export default PrivacyPage;
