import { cn } from '../../lib/cn';

interface TableProps {
  className?: string;
  children: React.ReactNode;
}

export function Table({ className, children }: TableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className, children }: TableProps) {
  return (
    <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)}>
      {children}
    </thead>
  );
}

export function TableBody({ className, children }: TableProps) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)}>
      {children}
    </tbody>
  );
}

export function TableRow({ className, children, onClick }: TableProps & { onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-border transition-colors',
        onClick && 'cursor-pointer hover:bg-muted/50',
        !onClick && 'hover:bg-muted/30',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children }: TableProps) {
  return (
    <th
      className={cn(
        'h-10 px-4 text-left align-middle text-xs font-semibold text-muted-foreground uppercase tracking-wide',
        '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children }: TableProps) {
  return (
    <td
      className={cn(
        'px-4 py-3 align-middle text-sm text-foreground',
        '[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
    >
      {children}
    </td>
  );
}

export function TableEmpty({ children, colSpan = 6 }: { children: React.ReactNode; colSpan?: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-32 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}
