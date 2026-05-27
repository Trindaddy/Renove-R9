import React, { useId } from 'react';

export default function Input({ label, name, type = 'text', id, ...props }) {
  // Se não foi passado um ID na prop, criamos um unívoco (A11y rule)
  const inputId = id || useId();

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {label && (
        <label htmlFor={inputId} className="text-[11px] uppercase tracking-[0.1em] text-slate-400 font-semibold cursor-pointer">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        className="tech-input w-full"
        {...props}
      />
    </div>
  );
}

