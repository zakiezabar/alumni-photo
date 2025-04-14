"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  // Get current year for copyright
  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-mono-100">Privacy Policy</h1>
      
      <div className="prose prose-invert max-w-none">
        <p className="text-mono-200 mb-6">
          Last Updated: {new Date().toLocaleDateString()}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">1. Introduction</h2>
          <p className="mb-4 text-mono-300">
            Welcome to Share Moments. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
          </p>
          <p className="mb-4 text-mono-300">
            This privacy policy applies to the personal information we collect through our website, events, and other activities related to the Share Moments platform.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">2. Information We Collect</h2>
          <p className="mb-4 text-mono-300">
            We may collect, use, store and transfer different kinds of personal data about you, which we have grouped together as follows:
          </p>
          <ul className="list-disc pl-6 mb-4 text-mono-300">
            <li className="mb-2">
              <strong>Identity Data</strong> includes first name, last name, username or similar identifier, and title.
            </li>
            <li className="mb-2">
              <strong>Contact Data</strong> includes email address.
            </li>
            <li className="mb-2">
              <strong>Technical Data</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform, and other technology on the devices you use to access this website.
            </li>
            <li className="mb-2">
              <strong>Profile Data</strong> includes your username and password, your interests, preferences, feedback, and survey responses.
            </li>
            <li className="mb-2">
              <strong>Usage Data</strong> includes information about how you use our website and services.
            </li>
            <li className="mb-2">
              <strong>Photo Data</strong> includes photographs you upload to our gallery or provide for your profile.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">3. How We Collect Your Data</h2>
          <p className="mb-4 text-mono-300">
            We use different methods to collect data from and about you including through:
          </p>
          <ul className="list-disc pl-6 mb-4 text-mono-300">
            <li className="mb-2">
              <strong>Direct interactions.</strong> You may give us your Identity, Contact, and Profile Data by filling in forms or by corresponding with us by post, phone, email, or otherwise.
            </li>
            <li className="mb-2">
              <strong>Automated technologies or interactions.</strong> As you interact with our website, we may automatically collect Technical Data about your equipment, browsing actions, and patterns.
            </li>
            <li className="mb-2">
              <strong>Third parties.</strong> We may receive personal data about you from various third parties, such as authentication providers when you sign in using services like Clerk.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">4. How We Use Your Data</h2>
          <p className="mb-4 text-mono-300">
            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
          </p>
          <ul className="list-disc pl-6 mb-4 text-mono-300">
            <li className="mb-2">To register you as a user of Share Moments.</li>
            <li className="mb-2">To manage our relationship with you.</li>
            <li className="mb-2">To enable you to participate in the photo gallery, events, or take part in surveys.</li>
            <li className="mb-2">To administer and protect our website (including troubleshooting, data analysis, testing, system maintenance, support, reporting, and hosting of data).</li>
            <li className="mb-2">To deliver relevant content and experiences to you.</li>
            <li className="mb-2">To make suggestions and recommendations to you about features or content that may be of interest to you.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">5. Data Security</h2>
          <p className="mb-4 text-mono-300">
            We have implemented appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors, and other third parties who have a business need to know.
          </p>
          <p className="mb-4 text-mono-300">
            We have procedures in place to deal with any suspected personal data breach and will notify you and any applicable regulator of a breach where we are legally required to do so.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">6. Your Legal Rights</h2>
          <p className="mb-4 text-mono-300">
            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
          </p>
          <ul className="list-disc pl-6 mb-4 text-mono-300">
            <li className="mb-2">Request access to your personal data.</li>
            <li className="mb-2">Request correction of your personal data.</li>
            <li className="mb-2">Request erasure of your personal data.</li>
            <li className="mb-2">Object to processing of your personal data.</li>
            <li className="mb-2">Request restriction of processing your personal data.</li>
            <li className="mb-2">Request transfer of your personal data.</li>
            <li className="mb-2">Right to withdraw consent.</li>
          </ul>
          <p className="mb-4 text-mono-300">
            If you wish to exercise any of the rights set out above, please contact us.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">7. Cookies</h2>
          <p className="mb-4 text-mono-300">
            Our website uses cookies to distinguish you from other users of our website. This helps us to provide you with a good experience when you browse our website and also allows us to improve our site.
          </p>
          <p className="mb-4 text-mono-300">
            You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">8. Third-Party Links</h2>
          <p className="mb-4 text-mono-300">
            This website may include links to third-party websites, plug-ins, and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements. When you leave our website, we encourage you to read the privacy policy of every website you visit.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">9. Data Retention</h2>
          <p className="mb-4 text-mono-300">
            We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
          </p>
          <p className="mb-4 text-mono-300">
            To determine the appropriate retention period for personal data, we consider the amount, nature, and sensitivity of the personal data, the potential risk of harm from unauthorized use or disclosure of your personal data, the purposes for which we process your personal data and whether we can achieve those purposes through other means, and the applicable legal requirements.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">10. Changes to This Privacy Policy</h2>
          <p className="mb-4 text-mono-300">
            We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page and updating the &quot;Last Updated&quot; date at the top of this privacy policy.
          </p>
          <p className="mb-4 text-mono-300">
            You are advised to review this privacy policy periodically for any changes. Changes to this privacy policy are effective when they are posted on this page.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-mono-100">11. Contact Us</h2>
          <p className="mb-4 text-mono-300">
            If you have any questions about this privacy policy or our privacy practices, please contact us at:
          </p>
          <div className="mb-4 text-mono-300">
            <p>Email: zakiezabar@gmail.com</p>
          </div>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-mono-700">
        <p className="text-mono-400 text-sm">
          © {currentYear} Share Moments. All rights reserved.
        </p>
        <p className="text-mono-400 text-sm mt-2">
          <Link href="/" className="text-secondary-400 hover:underline">
            Return to Home
          </Link>
        </p>
      </div>
    </div>
  );
}