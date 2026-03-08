import React, { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
  /** Hide this column on mobile card view */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pageSize?: number;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pageSize = 8,
  searchPlaceholder = 'Buscar...',
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [globalSearch, setGlobalSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...data];

    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      result = result.filter((row) =>
        columns.some((col) => {
          const val = row[col.key];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value) {
        const q = value.toLowerCase();
        result = result.filter((row) => {
          const val = row[key];
          return val != null && String(val).toLowerCase().includes(q);
        });
      }
    });

    if (sortKey && sortDir) {
      result.sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        const cmp = String(aVal).localeCompare(String(bVal), 'es', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, globalSearch, columnFilters, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    if (sortDir === 'asc') return <ChevronUp className="h-3 w-3" />;
    return <ChevronDown className="h-3 w-3" />;
  };

  const setGlobalSearchWithReset = (v: string) => { setGlobalSearch(v); setPage(1); };
  const setColumnFilterWithReset = (key: string, v: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: v }));
    setPage(1);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const Pagination = () => totalPages > 1 ? (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
      <span className="text-[10px] sm:text-xs text-muted-foreground">
        Pág. {safeCurrentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" disabled={safeCurrentPage === 1} onClick={() => setPage(1)}>
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" disabled={safeCurrentPage === 1} onClick={() => setPage(safeCurrentPage - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 3) pageNum = i + 1;
          else if (safeCurrentPage <= 2) pageNum = i + 1;
          else if (safeCurrentPage >= totalPages - 1) pageNum = totalPages - 2 + i;
          else pageNum = safeCurrentPage - 1 + i;
          return (
            <Button
              key={pageNum}
              variant={pageNum === safeCurrentPage ? 'default' : 'outline'}
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 text-xs"
              onClick={() => setPage(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
        <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" disabled={safeCurrentPage === totalPages} onClick={() => setPage(safeCurrentPage + 1)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" disabled={safeCurrentPage === totalPages} onClick={() => setPage(totalPages)}>
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalSearch}
            onChange={(e) => setGlobalSearchWithReset(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showColumnFilters ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowColumnFilters(!showColumnFilters)}
            className="hidden sm:flex"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtros
          </Button>
          <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
            {filtered.length} de {data.length}
          </span>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-2">
        {paginated.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No se encontraron registros
            </CardContent>
          </Card>
        ) : (
          paginated.map((row, idx) => (
            <Card
              key={(row as any).id || idx}
              className={`${onRowClick ? 'cursor-pointer active:bg-muted/50' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              <CardContent className="p-3 space-y-1.5">
                {columns.filter(c => !c.hideOnMobile).map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide flex-shrink-0">
                      {col.label}
                    </span>
                    <span className="text-xs font-medium text-right truncate">
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </span>
                  </div>
                ))}
                {actions && (
                  <div className="pt-2 border-t border-border flex justify-end" onClick={(e) => e.stopPropagation()}>
                    {actions(row)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="rounded-md border overflow-x-auto hidden sm:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={`${col.sortable !== false ? 'cursor-pointer select-none' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </div>
                </TableHead>
              ))}
              {actions && <TableHead className="w-[100px]">Acciones</TableHead>}
            </TableRow>
            {showColumnFilters && (
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={`filter-${col.key}`} className="py-1">
                    {col.filterable !== false ? (
                      <Input
                        placeholder={`Filtrar ${col.label.toLowerCase()}`}
                        value={columnFilters[col.key] || ''}
                        onChange={(e) => setColumnFilterWithReset(col.key, e.target.value)}
                        className="h-7 text-xs"
                      />
                    ) : null}
                  </TableHead>
                ))}
                {actions && <TableHead />}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                  No se encontraron registros
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row, idx) => (
                <TableRow
                  key={(row as any).id || idx}
                  className={onRowClick ? 'cursor-pointer' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className || ''}>
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </TableCell>
                  ))}
                  {actions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination />
    </div>
  );
}