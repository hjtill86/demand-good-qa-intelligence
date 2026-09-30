import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "../components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy | Demand Good QA",
  description: "Privacy Policy for Demand Good QA LLC.",
};

export default function PrivacyPage() {
  return (
    <LegalPage eyebrow="DEMAND GOOD QA LLC" title="Privacy Policy">
      <p>
        <b>Effective date:</b> August 26, 2026
        <br />
        <b>Governing law:</b> State of Indiana, United States
        <br />
        <b>Contact:</b> <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a>
      </p>
      <p>
        This Privacy Policy describes how Demand Good QA LLC (&quot;Company,&quot; &quot;we,&quot;
        &quot;us,&quot; or &quot;our&quot;) collects, uses, stores, shares, and protects personal
        information when you access or use our quality assurance services, products, websites, and
        applications. By using our services, you acknowledge that you have read and understood this
        Privacy Policy. If you do not agree with any part of this Policy, you should discontinue use of
        our services.
      </p>

      <h2>1. Introduction and overview</h2>
      <h3>1.1 Who we are</h3>
      <p>
        Demand Good QA LLC is a limited liability company organized under the laws of the State of
        Indiana, United States. We provide quality assurance services, testing solutions, software
        products, websites, and related applications to individuals and businesses.
      </p>
      <h3>1.2 What this policy covers</h3>
      <p>This Privacy Policy applies to personal information collected by Demand Good QA LLC through:</p>
      <ul>
        <li>Our websites and web-based platforms;</li>
        <li>Our software applications and services;</li>
        <li>Direct communications between you and Demand Good QA LLC, including email, support, and feedback; and</li>
        <li>Any other interaction you have with our company in connection with our products and services.</li>
      </ul>
      <p>
        This Policy does not apply to third-party websites, applications, or services that may be linked
        to or integrated with our services.
      </p>
      <h3>1.3 Why we collect data</h3>
      <p>
        We collect personal information to provide, operate, maintain, and improve our services; to
        process transactions; to communicate with users; to comply with applicable legal obligations; and
        to prevent fraud and unauthorized use.
      </p>

      <h2>2. Information we collect</h2>
      <h3>2.1 Account information</h3>
      <p>When you create an account, we may collect your full name, email address, username, and a password stored in hashed form.</p>
      <h3>2.2 Payment and billing information</h3>
      <p>
        If you subscribe to paid services, we collect billing name, billing address, and payment method
        details needed for billing. Payment card processing is handled by third-party payment processors.
        We do not receive, store, or process raw payment card numbers on our systems.
      </p>
      <h3>2.3 User-generated content</h3>
      <p>
        You may submit files, documents, test artifacts, feedback, support requests, and other content you
        voluntarily provide.
      </p>
      <h3>2.4 Operational and usage data</h3>
      <p>We automatically collect log files, IP addresses, device and browser details, pages and features used, session duration, timestamps, and referring URLs.</p>
      <h3>2.5 Cookies and tracking technologies</h3>
      <p>
        We use cookies and similar technologies, including those set by us or by service providers, to
        collect browsing behavior, session data, preferences, and device identifiers.
      </p>

      <h2>3. How we use your information</h2>
      <ul>
        <li>To provide, maintain, and secure the services you request.</li>
        <li>To process payments, manage subscriptions, and respond to billing inquiries.</li>
        <li>To send transactional messages such as receipts, security alerts, and support replies.</li>
        <li>To send marketing messages where permitted by law, subject to your right to opt out.</li>
        <li>To analyze usage, measure performance, and improve the product.</li>
        <li>To comply with law, respond to lawful requests, enforce our terms, and prevent fraud.</li>
        <li>To personalize content and settings where applicable.</li>
      </ul>

      <h2>4. Sharing and disclosure</h2>
      <p>
        We do not sell your personal data to third parties for their own marketing or advertising
        purposes. We may share information with service providers who host, support, or email on our
        behalf; with payment processors such as Stripe; with analytics providers; when required by law or
        to protect rights and safety; in a merger, acquisition, or similar business transfer; and when you
        give explicit consent.
      </p>
      <p>
        Demand Good QA LLC does not sell, rent, or trade your personal information for monetary or other
        valuable consideration, including as defined under the Indiana Consumer Data Protection Act
        (INCDPA).
      </p>

      <h2>5. Cookies</h2>
      <table className="report-table">
        <thead>
          <tr>
            <th>Cookie type</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Essential</td>
            <td>Required for authentication, security, and session management.</td>
          </tr>
          <tr>
            <td>Functional</td>
            <td>Remembers preferences such as language or region.</td>
          </tr>
          <tr>
            <td>Analytical</td>
            <td>Helps us understand aggregated or pseudonymous usage so we can improve the service.</td>
          </tr>
          <tr>
            <td>Marketing</td>
            <td>Used to measure or deliver relevant marketing, and may be set by third parties.</td>
          </tr>
        </tbody>
      </table>
      <p>
        You may control cookies in your browser. Disabling some cookies can affect how the service works.
        Third-party analytics or advertising providers may offer their own opt-out tools, including the
        Network Advertising Initiative and the Digital Advertising Alliance.
      </p>

      <h2>6. Analytics</h2>
      <p>
        We may use analytics services, including Google Analytics, to understand pages viewed, time on
        page, navigation, and approximate location derived from IP addresses. That data is generally
        aggregated or pseudonymous. You can install the Google Analytics Opt-Out Browser Add-On at{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noreferrer">
          tools.google.com/dlpage/gaoptout
        </a>
        .
      </p>

      <h2>7. Payment processors</h2>
      <p>
        Payment transactions are processed by PCI-DSS compliant third parties. We do not receive or store
        full payment card numbers, card verification values, or other sensitive card authentication data.
        Stripe&apos;s privacy policy is at{" "}
        <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
          stripe.com/privacy
        </a>
        . PayPal&apos;s privacy policy is at{" "}
        <a href="https://www.paypal.com/privacy" target="_blank" rel="noreferrer">
          paypal.com/privacy
        </a>
        .
      </p>

      <h2>8. Your rights and choices</h2>
      <p>
        If you are an Indiana resident, the Indiana Consumer Data Protection Act (INCDPA), IC 24-15,
        effective January 1, 2026, provides rights to access, correct, delete, and obtain a portable copy
        of personal data; to opt out of targeted advertising and certain profiling; and to opt out of the
        sale of personal data. We do not sell personal data.
      </p>
      <p>
        If we decline a request, you may appeal. We will respond to an appeal within 60 days. If the
        appeal is denied, you may contact the Indiana Attorney General. Email requests to{" "}
        <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a> with your name, account
        email, and the right you want to exercise. We respond to verifiable requests within 45 days, and
        may extend that period by another 45 days when we notify you of the reason. We will not
        discriminate against you for exercising these rights.
      </p>

      <h2>9. Data retention</h2>
      <p>
        We keep personal information while your account is active and for a reasonable period afterward,
        or as long as needed for the purposes in this Policy, including legal, contractual, and security
        needs. When the retention period ends, or when a verified deletion request is granted, we delete
        or de-identify the information. Backup copies are isolated from active processing until they can
        be deleted.
      </p>

      <h2>10. Data security</h2>
      <p>
        We use administrative, technical, and physical safeguards, including access controls, employee
        practices, TLS/SSL in transit, encryption at rest where applicable, and secure hosting. No method
        of transmission or storage is completely secure. If you believe your account or information was
        accessed without authorization, email{" "}
        <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a>.
      </p>

      <h2>11. Children&apos;s privacy</h2>
      <p>
        Our services are not directed to children under 13. We do not knowingly collect personal
        information from children under 13 without verifiable parental consent. If we learn that we have,
        we will delete it. Parents or guardians may email{" "}
        <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a> to review, stop, or delete
        a child&apos;s information. Under the INCDPA, personal data of known minors is treated as sensitive
        data and is not processed without consent from a parent or legal guardian.
      </p>

      <h2>12. International data transfers</h2>
      <p>
        Demand Good QA LLC is based in Indiana. Personal information we collect is stored and processed in
        the United States. If you access the services from outside the United States, your information may
        be transferred to and processed in the United States, where data protection laws may differ from
        those in your country. By using the services from outside the United States, you consent to that
        transfer. If you do not consent, discontinue use.
      </p>

      <h2>13. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy. When changes are material, we will email the address on your
        account and/or post a notice on the website or in the application, and we will update the effective
        date. Continued use after an update is acceptance of the revised Policy.
      </p>

      <h2>14. Contact</h2>
      <p>
        Demand Good QA LLC
        <br />
        Email: <a href="mailto:htillman@demandgoodqa.com">htillman@demandgoodqa.com</a>
      </p>
      <p>
        For a formal privacy request or complaint, use the subject line &quot;Privacy Rights Request&quot;
        or &quot;Privacy Complaint.&quot; Indiana residents who are not satisfied may contact the Indiana
        Attorney General at{" "}
        <a href="https://www.in.gov/attorneygeneral/" target="_blank" rel="noreferrer">
          in.gov/attorneygeneral
        </a>
        , Indiana Government Center South, 302 W. Washington Street, 5th Floor, Indianapolis, IN 46204.
      </p>
      <p>
        This Policy works together with our <Link href="/terms">Terms and Conditions</Link>.
      </p>
    </LegalPage>
  );
}
