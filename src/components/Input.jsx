import React from 'react';

export default function Input({ label, name, type = 'text', ...props }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs text-slate-300">{label}</span>}
      <input
        name={name}
        type={type}
        className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange focus:border-senac-orange placeholder:text-slate-500"
        {...props}
      />
    </label>
  );
}

