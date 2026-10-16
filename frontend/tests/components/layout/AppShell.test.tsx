import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { patientNav } from './nav';

const onSignOut = vi.fn();

function renderShell(path = '/patient/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell nav={patientNav} user={{ firstName: 'Maria', lastName: 'Santos' }} unreadCount={2} onSignOut={onSignOut}>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('marks the current page in the sidebar', () => {
    renderShell();
    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(within(main).getByRole('link', { name: 'Lab results' })).not.toHaveAttribute('aria-current');
  });

  it('does not mark Meal history as current on the Log a meal page', () => {
    renderShell('/patient/meals/new');
    const main = screen.getByRole('navigation', { name: 'Main' });
    expect(within(main).getByRole('link', { name: 'Log a meal' })).toHaveAttribute('aria-current', 'page');
    expect(within(main).getByRole('link', { name: 'Meal history' })).not.toHaveAttribute('aria-current');
  });

  it('announces unread notifications and offers a skip link', () => {
    renderShell();
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
  });

  it('opens and closes the mobile menu', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close menu' }));
    expect(screen.queryByRole('button', { name: 'Close menu' })).not.toBeInTheDocument();
  });

  it('signs out from the top bar', async () => {
    renderShell();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalled();
  });

  it('shows four short tabs and an Add-a-meal button on phones', () => {
    renderShell();
    const quick = screen.getByRole('navigation', { name: 'Quick' });
    expect(within(quick).getAllByRole('link').map((a) => a.textContent)).toEqual(['Home', 'History', 'Labs', 'Profile']);
    expect(screen.getByRole('link', { name: 'Add a meal' })).toHaveAttribute('href', '/patient/meals/new');
  });
});
