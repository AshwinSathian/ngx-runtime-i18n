import { render, screen } from '@testing-library/angular';
import { HeroLangCycleComponent } from './hero-lang-cycle.component';

describe('HeroLangCycleComponent', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('starts on the English word from the real I18nService', async () => {
    await render(HeroLangCycleComponent);
    expect(await screen.findByText('everyone')).toBeInTheDocument();
  });

  it('cycles to Hindi then German over time', async () => {
    await render(HeroLangCycleComponent);
    await screen.findByText('everyone');

    jest.advanceTimersByTime(2300);
    expect(await screen.findByText('सभी')).toHaveAttribute('lang', 'hi');

    jest.advanceTimersByTime(2300);
    expect(await screen.findByText('alle')).toHaveAttribute('lang', 'de');
  });

  it('does not start the cycle when reduced motion is preferred', async () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })),
    });

    await render(HeroLangCycleComponent);
    await screen.findByText('everyone');
    jest.advanceTimersByTime(5000);
    expect(screen.queryByText('सभी')).not.toBeInTheDocument();
  });
});
