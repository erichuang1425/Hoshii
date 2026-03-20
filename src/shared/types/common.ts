// Async operation state — use for ALL data fetching
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Paginated results for large lists
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Generic operation result from Rust commands
export interface OperationResult {
  success: boolean;
  message?: string;
}
