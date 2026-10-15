import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import StudioPage from './page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({ apiFetch: vi.fn(), apiError: vi.fn() }));
vi.mock('@/components/layout/DashboardShell', () => ({ DashboardShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/studio/DownloadStudio', () => ({ DownloadStudio: () => null }));
vi.mock('@/components/studio/AutoSyncCard', () => ({ AutoSyncCard: () => null }));
vi.mock('@/components/studio/JobPipeline', () => ({ JobPipeline: ({ jobs, loadError, onRetry }: { jobs: unknown[]; loadError?: string; onRetry?: () => void }) => (
  <div data-testid="job-pipeline">{jobs.length} jobs{loadError && <span role="alert">{loadError}</span>}{onRetry && <button onClick={onRetry}>Reload jobs</button>}</div>
) }));
vi.mock('@/components/modals/ArchiveImportModal', () => ({ ArchiveImportModal: () => null }));
vi.mock('@/components/studio/JobNotificationToast', () => ({ JobNotificationToast: () => null }));
vi.mock('@/components/modals/MediaLightboxModal', () => ({
  MediaLightboxModal: ({ item }: { item: unknown }) => item ? <div data-testid="media-popup" /> : null,
}));

const response = (value: unknown) => ({ ok: true, status: 200, json: async () => value } as Response);

function mockMedia(count: number) {
  vi.mocked(apiFetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('/media?')) return response(Array.from({ length: count }, (_, index) => ({
      id: index + 1, platform: 'x', username: 'creator', caption: null,
      files: [{ id: index + 1, kind: 'image', thumbnail_url: `/media-thumbnail/${index + 1}` }],
    })));
    if (url.includes('/jobs/stats')) return response({ total: 0, active_total: 0 });
    if (url.includes('/jobs?')) return response([]);
    return response({});
  });
}

afterEach(() => vi.clearAllMocks());

describe('Recent Downloads', () => {
  it('shows five smaller, display-only cards and keeps Vault link', async () => {
    mockMedia(5);
    render(<StudioPage />);
    await waitFor(() => expect(screen.getAllByAltText('Recent Media')).toHaveLength(5));
    expect(screen.getByText('5 LATEST')).toBeInTheDocument();
    expect(screen.getByText('View Full Vault').closest('a')).toHaveAttribute('href', '/vault');
    expect(screen.getByTestId('job-pipeline')).toBeInTheDocument();
    expect(screen.getAllByAltText('Recent Media')[0].closest('.grid')).toHaveClass('lg:grid-cols-5');
    fireEvent.click(screen.getAllByAltText('Recent Media')[0]);
    expect(screen.queryByTestId('media-popup')).not.toBeInTheDocument();
    expect(vi.mocked(apiFetch)).toHaveBeenCalledWith(expect.stringContaining('limit=5'), expect.anything());
  });

  it('labels fewer available media accurately', async () => {
    mockMedia(2);
    render(<StudioPage />);
    await waitFor(() => expect(screen.getAllByAltText('Recent Media')).toHaveLength(2));
    expect(screen.getByText('2 LATEST')).toBeInTheDocument();
  });

  it('keeps jobs below recent media after a successful response', async () => {
    mockMedia(5);
    const fetchMock = vi.mocked(apiFetch);
    const previous = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => String(input).includes('/jobs?')
      ? Promise.resolve(response([{ id: 9, platform: 'x', url: 'https://example.test', status: 'done', created_at: '2026-01-01T00:00:00Z' }]))
      : previous(input, init));
    render(<StudioPage />);
    await waitFor(() => expect(screen.getByTestId('job-pipeline')).toHaveTextContent('1 jobs'));
    expect(screen.getByTestId('job-pipeline').compareDocumentPosition(screen.getByText('Recent Downloads')) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it('shows a retryable error when the job request fails', async () => {
    mockMedia(0);
    const fetchMock = vi.mocked(apiFetch);
    const previous = fetchMock.getMockImplementation()!;
    fetchMock.mockImplementation((input, init) => String(input).includes('/jobs?')
      ? Promise.resolve({ ok: false, status: 503 } as Response)
      : previous(input, init));
    render(<StudioPage />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Could not load jobs (503)'));
    fireEvent.click(screen.getByRole('button', { name: 'Reload jobs' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(8));
  });
});
