function ErrorMessage({ title = 'Something went wrong', message }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
      <p className="font-semibold">{title}</p>
      {message ? <p className="mt-1 text-sm">{message}</p> : null}
    </div>
  );
}

export default ErrorMessage;
