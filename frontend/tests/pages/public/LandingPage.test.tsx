import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/pages/public/LandingPage';

describe('LandingPage', () => {
  it('leads with sign-up and the decision-support statement', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/know what’s on your plate/i);
    expect(screen.getAllByRole('link', { name: /create a free account/i })[0]).toHaveAttribute('href', '/register');
    expect(screen.getAllByText(/does not diagnose/i).length).toBeGreaterThan(0);
  });

  it('labels previews as sample data and makes no endorsement claims', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/illustration with fictional sample data/i)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/testimonial|clinically proven|FDA|certified|trusted by/i);
  });
});
