import type { ReactNode } from 'react';
import { Notice } from '@/components/ui';

function LegalShell({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 text-[13px] text-muted">Last updated {updated} · Policy version 2026-10</p>
      <Notice tone="warn" className="mt-6">
        Draft for a student capstone project. Bracketed items are placeholders to complete before launch.
      </Notice>
      <div className="mt-8 flex flex-col gap-6 leading-relaxed [&_h2]:text-lg [&_h2]:font-extrabold [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        {children}
      </div>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Privacy notice" updated="15 October 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          K-WAIS is operated by [operator name], [address]. For privacy questions or to exercise your rights, contact
          our data protection officer at [dpo@example.com].
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email address and a securely hashed password.</li>
          <li>Health and diet information you choose to enter: meals, condiments, drinks, allergies, restrictions, CKD stage, dialysis status, nutrient targets and lab results.</li>
          <li>Technical records: sign-in times and a one-way hash of your IP address, kept for security.</li>
        </ul>
        <p>We do not collect your address, government IDs or PhilHealth number.</p>
      </section>
      <section>
        <h2>Why we use it, and our legal basis</h2>
        <p>
          Health information is sensitive personal information under the Data Privacy Act of 2012 (Republic Act No.
          10173). We process it only with your explicit consent, given when you create an account, to show you
          nutrient estimates, scores and trends. If you turn on AI analysis, the meal text and the specific targets
          and lab values needed for that analysis are sent to our AI provider [Google Gemini API], without your name
          or email.
        </p>
      </section>
      <section>
        <h2>How we protect it</h2>
        <ul>
          <li>Lab result values are encrypted in our database.</li>
          <li>Passwords are stored only as salted, one-way hashes.</li>
          <li>Access to health records is logged.</li>
          <li>All traffic is encrypted in transit.</li>
        </ul>
      </section>
      <section>
        <h2>Your rights</h2>
        <p>
          You may access, correct, download or delete your data, object to processing, and withdraw consent at any
          time from Settings or by contacting us. You may also complain to the National Privacy Commission.
        </p>
      </section>
      <section>
        <h2>How long we keep it</h2>
        <p>
          We keep your data while your account is active. After you ask us to delete your account, we remove or
          anonymise it within [30] days, except security logs that the law requires us to keep.
        </p>
      </section>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Terms of use" updated="15 October 2026">
      <section>
        <h2>Using K-WAIS</h2>
        <p>
          K-WAIS helps you record meals and understand estimated nutrient intake. You must be at least [18] years old,
          or use it with a parent or guardian. Keep your password private; you are responsible for activity on your
          account.
        </p>
      </section>
      <section>
        <h2>Not medical advice</h2>
        <p>
          Estimates, scores and AI-written explanations are for information and discussion with your care team. They
          are not a diagnosis, prescription or treatment plan. See the <a href="/disclaimer">medical disclaimer</a>.
        </p>
      </section>
      <section>
        <h2>Accuracy</h2>
        <p>
          Nutrient values are estimated from food composition data and may differ from what you actually ate.
          Mixed dishes, guessed amounts and AI parsing can introduce errors. Always check what you entered.
        </p>
      </section>
      <section>
        <h2>Acceptable use</h2>
        <p>Do not try to access other people’s data, disrupt the service or enter information that is not yours.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>We will tell you in the app before these terms change in a way that affects you.</p>
      </section>
    </LegalShell>
  );
}

export function DisclaimerPage() {
  return (
    <LegalShell title="Medical disclaimer" updated="15 October 2026">
      <section>
        <p className="text-lg font-semibold">
          K-WAIS is a decision-support tool. It does not diagnose, treat, cure or prevent any disease, and it does not
          replace your nephrologist, doctor or renal dietitian.
        </p>
      </section>
      <section>
        <h2>What the numbers mean</h2>
        <ul>
          <li>Nutrient amounts are estimates from food composition tables and standard recipes.</li>
          <li>Scores compare those estimates only with targets and lab ranges you entered. K-WAIS does not set targets or decide what is safe for you.</li>
          <li>K-WAIS never works out your CKD stage from your answers or lab values.</li>
          <li>AI-written text is labelled and may contain mistakes.</li>
        </ul>
      </section>
      <section>
        <h2>When to get help</h2>
        <p>
          If you feel unwell, have symptoms such as swelling, shortness of breath, chest pain, confusion or very
          little urine, contact your doctor or go to the nearest emergency room. Do not wait for anything in this app.
        </p>
      </section>
    </LegalShell>
  );
}
