import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Inbox, Plus, Save, Sparkles, Trash2, Utensils } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Chip,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  HeroBand,
  IconButton,
  Input,
  Modal,
  NoTargetBar,
  Notice,
  PageHeader,
  ProgressBar,
  Segmented,
  Select,
  Skeleton,
  LoadingRegion,
  SourceTag,
  Spinner,
  StatusLabel,
  Switch,
  Textarea,
  useToast,
} from '@/components/ui';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Logo } from '@/components/layout/Logo';

/**
 * Development-only page listing every UI primitive in each state.
 * Open http://localhost:5173/dev/components. Not included in production builds' routes.
 */
export function ComponentGallery() {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ai, setAi] = useState(true);
  const [aiDark, setAiDark] = useState(true);
  const [chips, setChips] = useState<Record<string, boolean>>({ 'Toyo-mansi': true, Bagoong: true });
  const [amount, setAmount] = useState<'konti' | 'tsp' | 'tbsp' | 'marami'>('konti');

  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo tone="light" />
          <Link to="/patient/dashboard" className="font-semibold">
            Open the app shell →
          </Link>
        </div>

        <PageHeader
          title="Component gallery"
          description="Every shared UI piece in K-WAIS, in each state. Development only."
        />

        <Section title="Hero band">
          <HeroBand>
            <p className="text-[13px] font-semibold text-primary-line">Thursday, 15 October 2026</p>
            <h2 className="mt-1 text-[30px] font-extrabold tracking-tight">Good afternoon, Maria</h2>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Button variant="accent" size="lg" iconLeft={<Plus className="size-[18px]" strokeWidth={2.4} />}>
                Add a meal
              </Button>
              <Button variant="onDark" size="lg">
                Edit meal
              </Button>
            </div>
          </HeroBand>
        </Section>

        <Section title="Buttons">
          <Row>
            <Button variant="accent">Accent</Button>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger" iconLeft={<Trash2 className="size-4" />}>
              Delete
            </Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <Button variant="secondary" iconLeft={<Save className="size-4" />}>
              With icon
            </Button>
          </Row>
          <Row>
            <IconButton label="Notifications" icon={<Bell className="size-[18px]" />} />
            <IconButton label="Delete" icon={<Trash2 className="size-4" />} variant="ghost" />
          </Row>
        </Section>

        <Section title="Form fields">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" type="email" placeholder="you@example.com" hint="We’ll never share it." />
            <Input label="Password" type="password" error="Use at least 10 characters" defaultValue="short" />
            <Select label="Meal" defaultValue="lunch">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
            <Input label="Laboratory" optional placeholder="e.g. clinic or hospital lab" />
            <Textarea
              label="What did you eat?"
              containerClassName="sm:col-span-2"
              defaultValue="1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet"
              hint="English, Tagalog or Taglish all work."
            />
          </div>
          <Checkbox
            label="I agree to the processing of my health information"
            description="Required to log meals and lab results."
          />
        </Section>

        <Section title="Toggles">
          <Row>
            <Switch checked={ai} onChange={setAi} label="Analyse with AI" description={ai ? 'On' : 'Off'} />
            <div className="rounded-card bg-primary-deep p-3">
              <Switch
                tone="dark"
                checked={aiDark}
                onChange={setAiDark}
                label="Analyse with AI"
                description={aiDark ? 'On · nutrients and a score' : 'Off · just save it'}
              />
            </div>
          </Row>
          <Row>
            {['Toyo', 'Toyo-mansi', 'Patis', 'Bagoong', 'Suka'].map((c) => (
              <Chip key={c} selected={Boolean(chips[c])} onToggle={() => setChips((s) => ({ ...s, [c]: !s[c] }))}>
                {c}
              </Chip>
            ))}
          </Row>
          <Segmented
            label="Amount of toyo-mansi"
            value={amount}
            onChange={setAmount}
            options={[
              { value: 'konti', label: 'Konti' },
              { value: 'tsp', label: '1 tsp' },
              { value: 'tbsp', label: '1 tbsp' },
              { value: 'marami', label: 'Marami' },
            ]}
          />
        </Section>

        <Section title="Status, provenance and progress">
          <Row>
            <StatusLabel kind="within">Within your target (57%)</StatusLabel>
            <StatusLabel kind="near">Approaching your target (88%)</StatusLabel>
            <StatusLabel kind="above">Above your target (103%)</StatusLabel>
            <StatusLabel kind="below">Below slip range</StatusLabel>
            <StatusLabel kind="none">Estimate only · no target set</StatusLabel>
          </Row>
          <Row>
            <SourceTag kind="verified" detail="PhilFCT" />
            <SourceTag kind="estimated" detail="recipe" />
            <SourceTag kind="missing" />
            <SourceTag kind="ai" />
          </Row>
          <Row>
            <Badge>Estimated</Badge>
            <Badge tone="mint">5-day streak</Badge>
            <Badge tone="good">Good fit</Badge>
            <Badge tone="warn">Mixed</Badge>
            <Badge tone="bad">Needs attention</Badge>
            <Badge tone="info">Sample data</Badge>
            <Badge tone="ai">
              <Sparkles className="size-3" aria-hidden />
              AI · sample
            </Badge>
          </Row>
          <div className="grid gap-3 sm:max-w-sm">
            <ProgressBar value={57} label="Potassium, 57 percent of target" />
            <ProgressBar value={88} tone="warn" label="Protein, 88 percent of target" />
            <ProgressBar value={103} tone="bad" label="Sodium, 103 percent of target" />
            <NoTargetBar />
          </div>
        </Section>

        <Section title="Cards">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader title="Recent meals" subtitle="Last 4 entries" action={<Button variant="ghost" size="sm">View all</Button>} />
              <p className="text-muted">Card content</p>
            </Card>
            <Card tone="mint">
              <CardHeader title="Today’s meal score" />
              <p className="text-muted">Mint tone for the score card</p>
            </Card>
            <Card tone="ai">
              <CardHeader title="Suggestions from your recent meals" />
              <p className="text-muted">Lavender tone for AI text</p>
            </Card>
            <Card tone="warn">
              <CardHeader title="Check before saving" />
              <p className="text-muted">Apricot tone for review summaries</p>
            </Card>
          </div>
        </Section>

        <Section title="Notices">
          <Notice>Design preview with fictional sample data. This is not a real analysis.</Notice>
          <Notice tone="warn" title="How sure are these numbers?">
            Pinakbet is estimated from a standard recipe, and the toyo-mansi amount was guessed.
          </Notice>
          <Notice tone="bad">AI analysis is unavailable right now. Your meal was saved with computed numbers only.</Notice>
        </Section>

        <Section title="Loading, empty and error states">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <LoadingRegion label="Loading meals">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              </LoadingRegion>
              <Spinner className="mt-4" label="Analysing your meal" />
            </Card>
            <Card padding="none">
              <EmptyState
                icon={Utensils}
                title="No meals logged today"
                description="Log your first meal to see your nutrients."
                action={<Button variant="accent" size="sm">Add a meal</Button>}
              />
            </Card>
            <Card padding="none">
              <ErrorState message="Cannot reach K-WAIS right now. Check your connection." onRetry={() => toast.info('Retrying…')} />
            </Card>
          </div>
          <Card padding="none">
            <EmptyState icon={Inbox} title="No notifications" />
          </Card>
        </Section>

        <Section title="Dialogs and toasts">
          <Row>
            <Button variant="secondary" onClick={() => setModal(true)}>
              Open modal
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Delete meal…
            </Button>
            <Button variant="secondary" onClick={() => toast.success('Meal saved', 'Lunch was added to your history.')}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Couldn’t save', 'Check your connection and try again.')}>
              Error toast
            </Button>
          </Row>
        </Section>

        <Section title="Breadcrumbs">
          <Breadcrumbs items={[{ label: 'Dashboard', to: '/patient/dashboard' }, { label: 'Meal history', to: '/patient/meals' }, { label: 'Lunch, 15 Oct' }]} />
        </Section>
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add a lab result"
        description="Copy the value exactly as printed on your lab slip."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(false)}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => setModal(false)}>
              Save result
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Value" inputMode="decimal" defaultValue="5.6" />
          <Input label="Unit" defaultValue="mmol/L" />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm}
        title="Delete this meal?"
        description="Lunch on 15 October and its analysis will be removed from your history."
        confirmLabel="Delete meal"
        destructive
        loading={deleting}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setDeleting(true);
          window.setTimeout(() => {
            setDeleting(false);
            setConfirm(false);
            toast.success('Meal deleted');
          }, 800);
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-line pb-2 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
