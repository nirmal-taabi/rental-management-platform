function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
