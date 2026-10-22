import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { AppNotification } from '@/features/notifications/api';

const markRead = vi.fn();
const markAll = vi.fn();
let items: AppNotification[] = [];

vi.mock('@/features/notifications/api', () => ({
  useNotifications: () => ({ data: { items, unread: items.filter((i) => !i.read).length }, isPending: false, isError: false, refetch: vi.fn() }),
  useMarkRead: () => ({ mutateAsync: markRead }),
  useMarkAllRead: () => ({ mutate: markAll, isPending: false }),
}));

vi.mock('@/features/auth/AuthProvider', () => ({ useAuth: () => ({ user: { role: 'patient' } }) }));

const { NotificationsPage } = await import('@/features/notifications/NotificationsPage');

const reminder: AppNotification = {
  id: 'n1',
  type: 'meal_reminder',
  title: 'Time to log today’s meals',
  body: 'You haven’t logged anything today.',
  link: '/patient/meals/new',
  read: false,
  createdAt: new Date().toISOString(),
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/patient/notifications']}>
      <Routes>
        <Route path="/patient/notifications" element={<NotificationsPage />} />
        <Route path="/patient/meals/new" element={<p>Log page</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  markRead.mockResolvedValue(undefined);
  items = [reminder, { ...reminder, id: 'n0', read: true, title: 'Older reminder' }];
});

describe('NotificationsPage', () => {
  it('marks a notification read and opens its link', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Unread: Time to log today’s meals/ }));
    expect(markRead).toHaveBeenCalledWith('n1');
    expect(await screen.findByText('Log page')).toBeInTheDocument();
  });

  it('marks everything read', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(markAll).toHaveBeenCalled();
  });

  it('has an empty state', () => {
    items = [];
    renderPage();
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });
});
