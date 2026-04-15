import { useState, useMemo, useCallback } from "react";
import { useAppCollection } from "@rootcx/sdk";
import type { WhereClause, QueryOptions } from "@rootcx/sdk";
import type { PaginationState } from "@tanstack/react-table";

const DEFAULT_PAGE_SIZE = 25;

interface UsePaginatedCollectionOptions {
  where?: WhereClause;
  orderBy?: string;
  order?: "asc" | "desc";
  pageSize?: number;
}

export function usePaginatedCollection<T extends { id?: string } = Record<string, unknown>>(
  appId: string,
  entity: string,
  options: UsePaginatedCollectionOptions = {},
) {
  const { where, orderBy = "created_at", order = "desc", pageSize = DEFAULT_PAGE_SIZE } = options;
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });

  const whereKey = useMemo(() => JSON.stringify(where), [where]);
  const [prevWhereKey, setPrevWhereKey] = useState(whereKey);
  if (whereKey !== prevWhereKey) {
    setPrevWhereKey(whereKey);
    if (pagination.pageIndex !== 0) setPagination(p => ({ ...p, pageIndex: 0 }));
  }

  const query: QueryOptions = useMemo(() => ({
    where,
    orderBy,
    order,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  }), [where, orderBy, order, pagination.pageIndex, pagination.pageSize]);

  const result = useAppCollection<T>(appId, entity, query);

  const onPaginationChange = useCallback(
    (updater: PaginationState | ((prev: PaginationState) => PaginationState)) => {
      setPagination(prev => typeof updater === "function" ? updater(prev) : updater);
    },
    [],
  );

  return {
    ...result,
    pagination,
    onPaginationChange,
    rowCount: result.total,
    pageSize,
  };
}
