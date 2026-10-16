import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Chip, ConfirmDialog, Input, ProgressBar, Segmented, Switch, ToastProvider, useToast } from '@/components/ui';

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole('button', { name: /save/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});

describe('Input', () => {
  it('links the error message to the field for screen readers', () => {
    render(<Input label="Password" error="Use at least 10 characters" />);
    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Use at least 10 characters');
  });
});

describe('Switch', () => {
  it('reports and flips its state', async () => {
    function Harness() {
      const [on, setOn] = useState(true);
      return <Switch checked={on} onChange={setOn} label="Analyse with AI" />;
    }
    render(<Harness />);
    const sw = screen.getByRole('switch', { name: /analyse with ai/i });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(sw);
    expect(sw).toHaveAttribute('aria-checked', 'false');
  });
});

describe('Chip and Segmented', () => {
  it('chip exposes pressed state', async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return (
        <Chip selected={on} onToggle={() => setOn(!on)}>
          Toyo
        </Chip>
      );
    }
    render(<Harness />);
    const chip = screen.getByRole('button', { name: /toyo/i });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });

  it('segmented control selects one option', async () => {
    function Harness() {
      const [v, setV] = useState<'konti' | 'tbsp'>('konti');
      return (
        <Segmented
          label="Amount"
          value={v}
          onChange={setV}
          options={[
            { value: 'konti', label: 'Konti' },
            { value: 'tbsp', label: '1 tbsp' },
          ]}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('radio', { name: '1 tbsp' }));
    expect(screen.getByRole('radio', { name: '1 tbsp' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Konti' })).toHaveAttribute('aria-checked', 'false');
  });
});

describe('ProgressBar', () => {
  it('clamps values over 100', () => {
    render(<ProgressBar value={130} label="Sodium" />);
    expect(screen.getByRole('progressbar', { name: 'Sodium' })).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('ConfirmDialog', () => {
  it('calls confirm and cancel', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete this meal?"
        description="This cannot be undone."
        confirmLabel="Delete meal"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete meal' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });
});

describe('Toast', () => {
  it('shows a success message', async () => {
    function Trigger() {
      const toast = useToast();
      return <button onClick={() => toast.success('Meal saved')}>Save</button>;
    }
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByRole('status')).toHaveTextContent('Meal saved');
  });
});
