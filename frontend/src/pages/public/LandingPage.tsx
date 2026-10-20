import { Link } from 'react-router-dom';
import {
  ClipboardList,
  Database,
  FlaskConical,
  HeartHandshake,
  Languages,
  Lock,
  MessageCircleQuestion,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { Badge, ProgressBar, StatusLabel } from '@/components/ui';
import { ScoreRing } from '@/components/domain/ScoreRing';
import { btn } from './PublicLayout';

export function LandingPage() {
  return (
    <>
      <Hero />
      <Features />
      <HowItWorks />
      <Audiences />
      <Preview />
      <Limits />
      <Faq />
      <FinalCta />
    </>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary-dark text-white">
      <div aria-hidden className="pointer-events-none absolute -top-40 -right-24 size-[520px] rounded-full bg-[#0a7480]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 left-[38%] size-64 rounded-full bg-[#0c6b75]" />
      <div aria-hidden className="pointer-events-none absolute top-24 right-[44%] hidden size-5 rounded-full bg-accent lg:block" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <Badge tone="mint" className="self-start">
            For people living with chronic kidney disease
          </Badge>
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
            Know what’s on your plate, the kidney-friendly way.
          </h1>
          <p className="max-w-xl text-lg text-[#d7eeeb]">
            Type what you ate in English, Tagalog or Taglish. K-WAIS estimates the sodium, potassium, phosphorus and
            protein, compares them with the targets your care team gave you, and helps you prepare questions for your
            next check-up.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register" className={btn('accent')}>
              Create a free account
            </Link>
            <a href="#how-it-works" className={btn('onDark')}>
              See how it works
            </a>
          </div>
          <p className="text-[13px] text-[#d7eeeb]">
            Decision support only. K-WAIS does not diagnose or replace your doctor or dietitian.
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <figure className="relative">
      <div className="rounded-panel bg-surface p-5 text-ink shadow-hero sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[12.5px] text-muted">Lunch · 12:40 PM</p>
            <p className="font-extrabold">1 tasa kanin, inihaw na manok, pinakbet</p>
          </div>
        </div>
        <div className="mb-5 rounded-card bg-primary-soft p-4">
          <ScoreRing score={6} size={76} />
          <p className="mt-2 text-[12px] text-muted">Scored against the targets and lab ranges you entered</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MiniNutrient name="Sodium" value="1,580 mg" pct={79} kind="within" status="79% of your target" />
          <MiniNutrient name="Potassium" value="615 mg" pct={31} kind="within" status="31% of your target" />
          <MiniNutrient name="Phosphorus" value="320 mg" kind="none" status="No target set" />
          <MiniNutrient name="Protein" value="30 g" pct={60} kind="within" status="60% of your target" />
        </div>
      </div>
      <figcaption className="mt-3 text-center text-[12px] text-[#d7eeeb]">Illustration with fictional sample data</figcaption>
    </figure>
  );
}

function MiniNutrient({
  name,
  value,
  pct,
  kind,
  status,
}: {
  name: string;
  value: string;
  pct?: number;
  kind: 'within' | 'none';
  status: string;
}) {
  return (
    <div className="rounded-card border border-line p-3">
      <p className="text-[12px] font-semibold text-muted">{name}</p>
      <p className="text-lg font-extrabold">{value}</p>
      {pct !== undefined ? <ProgressBar value={pct} label={`${name} ${status}`} className="my-1.5" /> : <div className="h-5" />}
      <StatusLabel kind={kind} className="text-[11.5px]">
        {status}
      </StatusLabel>
    </div>
  );
}

function SectionHead({ id, eyebrow, title, intro }: { id?: string; eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="text-[13px] font-bold tracking-wide text-primary-dark uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-extrabold tracking-tight">
        {title}
      </h2>
      {intro && <p className="mt-3 text-muted">{intro}</p>}
    </div>
  );
}

const features: { icon: LucideIcon; title: string; body: string; tile: string }[] = [
  {
    icon: Languages,
    title: 'Log meals your way',
    body: 'Write “1 tasa kanin, isang hita ng inihaw na manok”. Add sawsawan like toyo, patis or bagoong with a tap.',
    tile: 'bg-sodium-soft text-sodium',
  },
  {
    icon: Database,
    title: 'Numbers from real food data',
    body: 'Each food is matched to the Philippine Food Composition Tables, with international foods covered too.',
    tile: 'bg-potassium-soft text-potassium',
  },
  {
    icon: FlaskConical,
    title: 'Your targets, your lab results',
    body: 'Scores use only what you entered: your care team’s targets and the ranges on your lab slip. Nothing is guessed.',
    tile: 'bg-phosphorus-soft text-phosphorus',
  },
  {
    icon: MessageCircleQuestion,
    title: 'Better questions for your doctor',
    body: 'Every analysis suggests questions to bring to your next visit, so check-ups start from your real meals.',
    tile: 'bg-protein-soft text-protein',
  },
];

function Features() {
  return (
    <section aria-labelledby="features-title" id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHead
        id="features-title"
        eyebrow="Features"
        title="Built around how Filipino families eat"
        intro="Kidney diets are hard to follow when every food list was written for someone else’s kitchen."
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body, tile }) => (
          <article key={title} className="rounded-panel border border-line bg-surface p-6 shadow-card">
            <span className={`mb-4 flex size-11 items-center justify-center rounded-card ${tile}`}>
              <Icon className="size-[22px]" aria-hidden />
            </span>
            <h3 className="mb-1.5 text-[17px] font-extrabold">{title}</h3>
            <p className="text-[13.5px] text-muted">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const steps = [
  {
    title: 'Tell us what you ate',
    body: 'Type the meal in your own words, pick sauces and drinks, or tap a meal you logged before.',
  },
  {
    title: 'We look up every food',
    body: 'K-WAIS turns your words into foods and amounts, then calculates nutrients from food composition data. You can also just save the meal without analysis.',
  },
  {
    title: 'AI explains what it means',
    body: 'You get a 1–10 score with reasons, based only on the targets and lab values you supplied, plus questions for your care team.',
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="how-title" id="how-it-works" className="scroll-mt-20 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead id="how-title" eyebrow="How it works" title="From your plate to a clear picture in three steps" />
        <ol className="grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-panel bg-canvas p-6">
              <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-primary-dark text-lg font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="mb-1.5 text-[17px] font-extrabold">{s.title}</h3>
              <p className="text-[13.5px] text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-[#475569]">
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-4 text-good" aria-hidden /> Numbers come from food data, not the AI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-4 text-ai" aria-hidden /> AI writes the explanation and is labelled
          </span>
        </div>
      </div>
    </section>
  );
}

function Audiences() {
  return (
    <section aria-label="Who K-WAIS is for" className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 md:grid-cols-2">
      <article className="rounded-panel bg-primary-dark p-7 text-white">
        <HeartHandshake className="mb-4 size-8 text-accent" aria-hidden />
        <h2 className="mb-3 text-2xl font-extrabold">For patients</h2>
        <ul className="flex flex-col gap-2.5 text-[#d7eeeb]">
          <li>See today’s sodium, potassium, phosphorus and protein at a glance</li>
          <li>Keep your lab results in one place, encrypted, next to what you ate</li>
          <li>Notice patterns over days and weeks without spreadsheets</li>
          <li>Get gentle reminders to log, never alarms</li>
        </ul>
        <Link to="/register" className={`${btn('accent')} mt-6`}>
          Start for free
        </Link>
      </article>
      <article className="rounded-panel border border-line bg-surface p-7">
        <Stethoscope className="mb-4 size-8 text-primary" aria-hidden />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-extrabold">For care teams</h2>
          <Badge tone="info">Coming in a later version</Badge>
        </div>
        <ul className="flex flex-col gap-2.5 text-muted">
          <li>Review a patient’s meal records and trends between visits</li>
          <li>Set clinician-approved targets that patients’ scores follow</li>
          <li>Add notes and feedback that patients see in the app</li>
          <li>Export reports as PDF or CSV</li>
        </ul>
        <p className="mt-6 text-[13px] text-muted">
          Patients control sharing. A doctor only sees records of patients who linked them.
        </p>
      </article>
    </section>
  );
}

function Preview() {
  return (
    <section aria-labelledby="preview-title" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead id="preview-title" eyebrow="A look inside" title="Clear enough to read at the dinner table" />
        <div className="grid gap-6 lg:grid-cols-2">
          <figure className="rounded-panel bg-canvas p-5">
            <div className="rounded-card bg-primary-dark p-5 text-white">
              <p className="text-[12.5px] text-[#d7eeeb]">Log a meal</p>
              <p className="mb-3 text-xl font-extrabold">What did you have for lunch?</p>
              <p className="rounded-field bg-surface p-3 text-ink">1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {['✓ Toyo-mansi · konti', '✓ Bagoong · 1 tsp', '✓ Tubig', '+ Patis', '+ Suka'].map((c) => (
                <span key={c} className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold">
                  {c}
                </span>
              ))}
            </div>
            <figcaption className="mt-3 text-[12px] text-muted">Meal logging · sample data</figcaption>
          </figure>
          <figure className="rounded-panel bg-canvas p-5">
            <div className="flex flex-col gap-2.5">
              <ReasonRow pts="−3" tone="bad" text="Sodium is over the target you entered (2,060 of 2,000 mg today)." />
              <ReasonRow pts="−2" tone="bad" text="Toyo-mansi and bagoong conflict with your low-salt restriction." />
              <ReasonRow pts="0" tone="neutral" text="Potassium within your target: 615 mg in this meal." />
              <ReasonRow pts="—" tone="neutral" text="Phosphorus not scored: you have not entered a target." />
            </div>
            <figcaption className="mt-3 text-[12px] text-muted">Why this score · sample data</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

function ReasonRow({ pts, tone, text }: { pts: string; tone: 'bad' | 'neutral'; text: string }) {
  return (
    <div className={`flex gap-3 rounded-card border p-3 ${tone === 'bad' ? 'border-[#fca5a5] bg-bad-soft' : 'border-line bg-surface'}`}>
      <span className={`w-9 shrink-0 font-extrabold ${tone === 'bad' ? 'text-bad' : 'text-[#475569]'}`}>{pts}</span>
      <span className="text-[13.5px]">{text}</span>
    </div>
  );
}

function Limits() {
  const items: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: ClipboardList, title: 'Not a diagnosis', body: 'K-WAIS never works out your CKD stage or tells you a food is safe. Those calls belong to your care team.' },
    { icon: FlaskConical, title: 'Nothing assumed', body: 'Without a target or lab range from you, you see the estimate only, with no score and no warning colours.' },
    { icon: Lock, title: 'Your data, protected', body: 'Lab values are encrypted at rest. Health data is handled under the Philippine Data Privacy Act of 2012.' },
    { icon: ShieldCheck, title: 'Honest about uncertainty', body: 'Every number shows where it came from: verified food data, an estimate, or missing.' },
  ];
  return (
    <section aria-labelledby="limits-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <SectionHead id="limits-title" eyebrow="Safety first" title="What K-WAIS will and won’t do" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col gap-2">
            <Icon className="size-6 text-primary" aria-hidden />
            <h3 className="font-extrabold">{title}</h3>
            <p className="text-[13.5px] text-muted">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  {
    q: 'Is K-WAIS a medical device or a replacement for my nephrologist?',
    a: 'No. It is a decision-support and record-keeping tool. It estimates nutrients and explains them so you can talk with your care team. Always follow your doctor’s and dietitian’s advice.',
  },
  {
    q: 'Where do the nutrient numbers come from?',
    a: 'From food composition data, mainly the Philippine Food Composition Tables published by DOST-FNRI, with international food databases for foods not in it. Mixed dishes like pinakbet are estimated from standard recipes and labelled “estimated”.',
  },
  {
    q: 'What does the AI do, and what does it not do?',
    a: 'The AI reads your meal description to identify foods and amounts, then explains the calculated results in plain language and suggests questions for your doctor. It does not invent nutrient values and it only uses targets and lab values you entered.',
  },
  {
    q: 'Do I need lab results or targets to use it?',
    a: 'No. You can log meals and see nutrient estimates right away. The 1–10 score appears once you add a target from your care team or lab results with the reference ranges printed on your slip.',
  },
  {
    q: 'Can I log a meal without AI analysis?',
    a: 'Yes. Switch “Analyse with AI” off and the meal is simply saved to your history. You can analyse it later.',
  },
  {
    q: 'Who can see my data?',
    a: 'Only you. In a later version you will be able to link your own doctor, who will then see your records. You can download your data or ask for it to be deleted at any time.',
  },
];

function Faq() {
  return (
    <section aria-labelledby="faq-title" id="faq" className="scroll-mt-20 bg-surface py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHead id="faq-title" eyebrow="FAQ" title="Questions people ask" />
        <div className="flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-card border border-line bg-canvas p-5 open:bg-surface">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-bold">
                {f.q}
                <span aria-hidden className="text-xl leading-none text-primary transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-[14px] text-[#475569]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="relative overflow-hidden rounded-hero bg-primary-dark px-6 py-12 text-center text-white sm:px-12">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 size-64 rounded-full bg-[#0a7480]" />
        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4">
          <h2 className="text-3xl font-extrabold tracking-tight">Start with your next meal</h2>
          <p className="text-[#d7eeeb]">It takes about a minute to sign up. No lab results needed to begin.</p>
          <Link to="/register" className={btn('accent')}>
            Create a free account
          </Link>
        </div>
      </div>
    </section>
  );
}
