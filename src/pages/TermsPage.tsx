import React from 'react';
import Container from '@/components/layout/Container';
import SEO from '@/components/SEO';

const TermsPage: React.FC = () => (
  <>
    <SEO title="Terms of Service - Tools4Genz" description="Terms for using Tools4Genz tools, services, and digital project purchases." />
    <main className="py-16"><Container><article className="prose prose-slate mx-auto max-w-3xl dark:prose-invert">
      <h1>Terms of Service</h1><p><strong>Last updated: 19 August 2026</strong></p>
      <p>By using Tools4Genz, you agree to use the platform lawfully and not interfere with its operation, security, payment processing, or access controls.</p>
      <h2>Tools and service requests</h2><p>Browser tools are provided for general use. A submitted service request is an enquiry, not a promise of acceptance, delivery date, or price. Any project scope and commercial terms must be agreed separately.</p>
      <h2>Digital purchases</h2><p>Project prices and availability are determined by the server at order time. Payment must be confirmed before delivery is authorized. A paid order may remain in a preparing state until its private artifact is available.</p>
      <h2>Downloads and licence</h2><p>Purchase access is tied to the paid order and its secure access credentials. Do not share recovery links or access tokens. Unless a project states otherwise, a purchase grants use of the delivered project; it does not transfer ownership of the Tools4Genz platform or permit reselling the project unchanged.</p>
      <h2>Availability and refunds</h2><p>We do not promise uninterrupted operation. If a paid item cannot be delivered, contact support with the order ID. Refund or resolution requests are assessed using the payment and delivery records and applicable law.</p>
      <h2>Advertising and sponsored recommendations</h2><p>If enabled, advertisements and affiliate recommendations are separated from primary controls and labelled where appropriate. A sponsored or affiliate link may compensate Tools4Genz if you purchase through it, without necessarily changing your price. Third-party destinations have their own terms and privacy practices; inclusion is not a guarantee of their products or services.</p>
      <h2>Premium tool foundation</h2><p>Some tools may be labelled as a future premium tier or coming soon. No premium subscription, recurring billing, or entitlement is offered unless a separate purchase flow and terms are explicitly made available.</p>
      <h2>Contact</h2><p>Use the <a href="/contact">contact form</a> for order, delivery, or terms questions.</p>
    </article></Container></main>
  </>
);
export default TermsPage;
