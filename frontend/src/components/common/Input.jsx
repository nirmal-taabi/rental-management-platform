function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200 ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''} ${className}`}
        {...props}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export default Input;
