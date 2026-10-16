import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile, Target } from '@/features/profile/api';
import { DietSection, KidneySection, TargetsSection } from '@/features/profile/sections';

const profile: Profile = {
  patientCode: 'KW-000123',
  firstName: 'Maria',
  lastName: 'Santos',
  birthYear: null,
  sex: null,
  dietaryPreferences: [],
  allergies: [],
  restrictions: ['Low-salt diet'],
  ckdStage: { value: '3b', source: 'clinician_verified' },
  dialysisStatus: 'none',
  reminderTime: null,
  timezone: 'Asia/Manila',
  onboarding: { step: 0, complete: false },
  updatedAt: '2026-10-15T00:00:00Z',
};

const sodium: Target = { nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '2026-10-01' };

describe('TargetsSection', () => {
  it('sends only what changed, with null for a cleared target', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<TargetsSection targets={[sodium]} submitLabel="Save targets" onSubmit={onSubmit} />);

    await userEvent.clear(screen.getByLabelText('Sodium, daily maximum (mg)'));
    await userEvent.type(screen.getByLabelText('Protein, daily maximum (g)'), '50');
    await userEvent.click(screen.getByRole('button', { name: 'Save targets' }));

    expect(onSubmit).toHaveBeenCalledWith({ sodium: null, protein: 50 });
  });

  it('rejects zero', async () => {
    const onSubmit = vi.fn();
    render(<TargetsSection targets={[]} submitLabel="Save targets" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Potassium, daily maximum (mg)'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Save targets' }));
    expect(screen.getByText(/enter an amount above zero/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the server’s message when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('x'));
    render(<TargetsSection targets={[]} submitLabel="Save targets" onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Sodium, daily maximum (mg)'), '2000');
    await userEvent.click(screen.getByRole('button', { name: 'Save targets' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });
});

describe('KidneySection', () => {
  it('says K-WAIS never works out a stage, and warns before overriding a verified one', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<KidneySection profile={profile} submitLabel="Save" onSubmit={onSubmit} />);
    expect(screen.getByText(/never works out a CKD stage/i)).toBeInTheDocument();
    expect(screen.getByText(/your clinician verified your stage/i)).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Stage 4'));
    await userEvent.click(screen.getByLabelText('Hemodialysis'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledWith({ ckdStage: '4', dialysisStatus: 'hemodialysis' });
  });
});

describe('DietSection', () => {
  it('combines suggestion chips and typed entries', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<DietSection profile={profile} submitLabel="Save" onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /^Shrimp$/ }));
    const inputs = screen.getAllByPlaceholderText('Type and press Enter');
    await userEvent.type(inputs[1]!, 'Bagoong{Enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      restrictions: ['Low-salt diet'],
      allergies: ['Shrimp', 'Bagoong'],
      dietaryPreferences: [],
    });
  });
});
