interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const baseClasses = 'bg-gradient-to-r from-dark-elevated via-dark-border to-dark-elevated bg-[length:200%_100%] animate-shimmer';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton patterns for common use cases
export function CardSkeleton() {
  return (
    <div className="bg-dark-card rounded-xl shadow-lg p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={20} />
          <Skeleton width="40%" height={16} />
        </div>
      </div>
      <Skeleton height={40} />
      <div className="flex gap-2">
        <Skeleton height={36} className="flex-1" />
        <Skeleton height={36} className="flex-1" />
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-dark-card rounded-xl p-4 space-y-2">
          <Skeleton width="50%" height={12} />
          <Skeleton width="80%" height={28} />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-dark-elevated rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={16} />
            <Skeleton width="40%" height={14} />
          </div>
          <Skeleton width={80} height={32} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-dark-elevated rounded-lg">
        <Skeleton width="5%" height={16} />
        <Skeleton width="30%" height={16} />
        <Skeleton width="25%" height={16} />
        <Skeleton width="20%" height={16} />
        <Skeleton width="20%" height={16} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-3 border-b border-dark-border">
          <Skeleton width="5%" height={14} />
          <Skeleton width="30%" height={14} />
          <Skeleton width="25%" height={14} />
          <Skeleton width="20%" height={14} />
          <Skeleton width="20%" height={14} />
        </div>
      ))}
    </div>
  );
}

// Stock page specific skeletons
export function StockCardSkeleton() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton width={60} height={24} />
            <Skeleton width={40} height={20} />
            <Skeleton width={40} height={16} />
          </div>
          <Skeleton width="60%" height={14} />
        </div>
        <div className="text-right space-y-1">
          <Skeleton width={80} height={28} />
          <Skeleton width={50} height={12} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 bg-dark-base/50 rounded-lg">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-1">
            <Skeleton width="50%" height={10} />
            <Skeleton width="70%" height={14} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton height={40} className="flex-1" />
        <Skeleton height={40} className="flex-1" />
      </div>
    </div>
  );
}

export function PortfolioSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-dark-card border-l-4 border-l-dark-border border border-dark-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton variant="rectangular" width={32} height={32} />
            <Skeleton width="60%" height={12} />
          </div>
          <Skeleton width="80%" height={32} className="mb-2" />
          <Skeleton width="50%" height={12} />
        </div>
      ))}
    </div>
  );
}

export function MarketTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-6 gap-4 p-4 bg-dark-elevated border-b border-dark-border">
        <Skeleton width="60%" height={14} />
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="70%" height={14} />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 p-4 border-b border-dark-border/50">
          <div className="flex items-center gap-2">
            <Skeleton width={50} height={18} />
            <Skeleton width={20} height={14} />
          </div>
          <Skeleton width="80%" height={14} />
          <Skeleton width={70} height={18} />
          <Skeleton width={50} height={14} />
          <Skeleton width={60} height={14} />
          <div className="flex gap-2">
            <Skeleton width={50} height={28} />
            <Skeleton width={50} height={28} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-dark-elevated rounded-lg">
          <div className="flex items-center gap-2">
            <Skeleton width={40} height={16} />
            <Skeleton width={30} height={20} />
          </div>
          <div className="text-right space-y-1">
            <Skeleton width={50} height={14} />
            <Skeleton width={40} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}
