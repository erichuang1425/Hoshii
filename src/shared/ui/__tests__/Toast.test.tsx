import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ToastProvider, useToast } from '../ToastProvider';

function TestTrigger() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.info('Info message')}>Info</button>
      <button onClick={() => toast.error('Error message')}>Error</button>
      <button onClick={() => toast.success('Success message')}>Success</button>
    </div>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toast on trigger', () => {
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('auto-dismisses after timeout', () => {
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('dismisses on close button click', () => {
    render(
      <ToastProvider>
        <TestTrigger />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });
});
