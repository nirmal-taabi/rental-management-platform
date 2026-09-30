import PropTypes from 'prop-types';

function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  isConfirming = false,
  destructive = false,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#252a29]/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isConfirming) onCancel();
      }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="confirmation-dialog-title" className="w-full max-w-md border border-[#e6e8e4] bg-white p-5 shadow-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8a5360]">Confirm action</p>
        <h2 id="confirmation-dialog-title" className="mt-2 text-lg font-semibold text-[#252a29]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#59615e]">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={isConfirming} className="inline-flex min-h-10 items-center rounded-md border border-[#dfe3df] bg-white px-4 text-sm font-medium text-[#414846] transition hover:bg-[#f8f9f6] disabled:cursor-not-allowed disabled:opacity-60">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={isConfirming} className={`inline-flex min-h-10 items-center rounded-md px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${destructive ? 'bg-rose-800 hover:bg-rose-900' : 'bg-[#68404b] hover:bg-[#54333d]'}`}>
            {isConfirming ? 'Please wait...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

ConfirmationDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string.isRequired,
  isConfirming: PropTypes.bool,
  destructive: PropTypes.bool,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default ConfirmationDialog;