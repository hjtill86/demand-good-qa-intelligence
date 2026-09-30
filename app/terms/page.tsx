import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Terms and Conditions | Demand Good QA",
  description: "Terms and Conditions for Demand Good QA LLC services.",
};

export default function TermsPage() {
  return (
    <LegalPage eyebrow="DEMAND GOOD QA LLC" title="Terms and Conditions">
      <h2>1. Introduction</h2>
      <p>Effective date: May 05, 2026</p>
      <p>
        These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the services,
        products, websites, and applications provided by Demand Good QA LLC. By accessing or using any
        Company service, you agree to be bound by these Terms.
      </p>

      <h2>2. Definitions</h2>
      <p>
        <b>Services:</b> All products, features, content, software, and functionality provided by the
        Company. <b>User / You:</b> Any person or entity who accesses or uses the Services.{" "}
        <b>Account:</b> A registered user profile or other mechanism that allows access to restricted
        Services.
      </p>

      <h2>3. Acceptance of Terms</h2>
      <p>
        By using the Services you confirm that you have read, understood, and agree to these Terms and
        any policies referenced herein. If you do not agree, do not use the Services. You represent that
        you are legally capable of entering into a binding contract and meet any minimum age requirements
        set by applicable law.
      </p>

      <h2>4. Account Registration and Security</h2>
      <p>
        Some Services require creating an Account. You must provide accurate, current, and complete
        information. You are responsible for maintaining the confidentiality of your Account credentials
        and for all activity under your Account. Notify us immediately of any unauthorized use.
      </p>

      <h2>5. User Conduct and Obligations</h2>
      <p>Use the Services only for lawful purposes and in accordance with these Terms. You must not:</p>
      <ul>
        <li>Violate laws or third-party rights.</li>
        <li>Upload or distribute harmful, illegal, or infringing content.</li>
        <li>Attempt to gain unauthorized access to systems.</li>
        <li>Interfere with the operation or security of the Services.</li>
      </ul>
      <p>
        You retain ownership of content you submit, and you grant the Company a worldwide, royalty-free,
        non-exclusive license to use, reproduce, modify, publish, and distribute that content as necessary
        to operate and improve the Services.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        All Company trademarks, logos, designs, text, graphics, software, and other materials are the
        Company&apos;s property or licensed to the Company. You may not use Company intellectual property
        without prior written permission. If you provide suggestions or feedback, you grant the Company a
        perpetual, irrevocable, royalty-free license to use and commercialize that feedback.
      </p>

      <h2>7. Payments, Fees, and Refunds</h2>
      <p>
        Paid Services require payment of fees as described at the time of purchase. All fees are
        non-refundable except as expressly stated. You authorize us to charge your chosen payment method
        for fees and applicable taxes. Keep payment information current. Any refunds will be handled
        according to the Company&apos;s refund policy posted on the site. If no policy exists, refunds are
        issued only at the Company&apos;s discretion.
      </p>

      <h2>8. Disclaimers and Limitation of Liability</h2>
      <p>
        The Services are provided as is and as available without warranties of any kind, whether express
        or implied. The Company does not warrant that the Services will be uninterrupted, error-free, or
        secure. To the maximum extent permitted by law, the Company&apos;s total liability for any claim
        arising from or related to these Terms or the Services will not exceed the amount you paid to the
        Company in the 12 months preceding the claim, or $100 if you paid nothing. The Company is not
        liable for indirect, incidental, special, consequential, or punitive damages. Nothing in these
        Terms limits liability that cannot be excluded by law.
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify, defend, and hold harmless the Company and its officers, directors,
        employees, and agents from any claims, liabilities, losses, damages, costs, and expenses
        (including reasonable attorneys&apos; fees) arising from your breach of these Terms, your misuse of
        the Services, or your violation of any law or third-party rights.
      </p>

      <h2>10. Termination and Suspension</h2>
      <p>
        The Company may suspend or terminate your access to the Services at any time for violation of
        these Terms or for any other reason with or without notice. Upon termination, your right to use
        the Services ends. Sections that by their nature survive termination (including Intellectual
        Property, Disclaimers, Limitation of Liability, Indemnification, and Governing Law) will continue
        in effect.
      </p>

      <h2>11. Changes to Services and Terms</h2>
      <p>
        The Company may modify, suspend, or discontinue any Service at any time. We may update these Terms
        from time to time. When changes are material, we will provide notice. Continued use after notice
        constitutes acceptance of the updated Terms.
      </p>

      <h2>12. Governing Law and Dispute Resolution</h2>
      <p>
        These Terms are governed by the laws of the State of Indiana, United States, without regard to
        conflict-of-law principles. Disputes will be resolved as set out in our dispute resolution policy.
        If no policy exists, disputes will be resolved in the courts located in Hendrick County in Indiana
        and you consent to personal jurisdiction there. If required by applicable law, disputes may be
        subject to arbitration.
      </p>

      <h2>13. Third-Party Links and Services</h2>
      <p>
        The Services may contain links to third-party websites, products, or services. The Company does
        not control and is not responsible for third-party content, practices, or policies. Use
        third-party services at your own risk.
      </p>

      <h2>14. Privacy</h2>
      <p>
        Your use of the Services is also governed by the Company&apos;s{" "}
        <Link href="/privacy">Privacy Policy</Link>, which explains how we collect, use, and share
        personal information. By using the Services you consent to that collection and use.
      </p>

      <h2>15. Miscellaneous</h2>
      <p>
        These Terms, together with any policies or agreements referenced herein, constitute the entire
        agreement between you and the Company regarding the Services. If any provision is found invalid,
        the remaining provisions remain in effect. Failure to enforce any right is not a waiver of that
        right. You may not assign these Terms without the Company&apos;s prior written consent. The Company
        may assign these Terms without restriction.
      </p>

      <h2>16. Contact Information</h2>
      <p>
        Demand Good QA LLC
        <br />
        Email: <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a>
      </p>
    </LegalPage>
  );
}
