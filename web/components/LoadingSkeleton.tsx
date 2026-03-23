export default function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-gray-900 border border-gray-800/80 rounded-2xl overflow-hidden animate-pulse">
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-800" />
          <div className="p-5 pl-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="h-4 bg-gray-800 rounded w-3/4" />
              <div className="h-4 bg-gray-800 rounded w-20 flex-shrink-0" />
            </div>
            <div className="flex gap-3 mb-4">
              <div className="h-3 bg-gray-800 rounded w-28" />
              <div className="h-3 bg-gray-800 rounded w-12" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-800 rounded w-5/6" />
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-800/60">
              <div className="h-3 bg-gray-800 rounded w-24" />
              <div className="h-3 bg-gray-800 rounded w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
