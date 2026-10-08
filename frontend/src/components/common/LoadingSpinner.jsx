function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-6 text-slate-600">
      <span
        className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
        aria-label="Loading"
      />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

export default LoadingSpinner;
