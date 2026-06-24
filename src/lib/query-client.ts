import { QueryClient } from '@tanstack/react-query';

// Portado 1:1 desde el original (src/lib/query-client.js).
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
