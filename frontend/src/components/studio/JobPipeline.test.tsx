import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { JobPipeline } from './JobPipeline';

const job = { id: 1, platform: 'x', url: 'https://example.test/post', status: 'done' as const, created_at: '2026-01-01T00:00:00Z' };

describe('Job Pipeline visibility', () => {
  it('stays visible with a clear empty-state message', () => {
    render(<JobPipeline jobs={[]} />);
    expect(screen.getByRole('heading', { name: 'Batch Import & Queue Pipeline' })).toBeInTheDocument();
    expect(screen.getByText('No jobs yet.')).toBeInTheDocument();
  });

  it('shows loading rather than empty history before the first response', () => {
    render(<JobPipeline jobs={[]} loading />);
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
    expect(screen.queryByText('No jobs yet.')).not.toBeInTheDocument();
  });

  it('distinguishes load failure and offers retry', () => {
    const retry = vi.fn();
    render(<JobPipeline jobs={[]} loadError="Jobs unavailable" onRetry={retry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Jobs unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry loading jobs' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows filtered empty state when history exists', () => {
    render(<JobPipeline jobs={[job]} />);
    fireEvent.click(screen.getByRole('button', { name: /Active/ }));
    expect(screen.getByText('No jobs match these filters.')).toBeInTheDocument();
  });
});
