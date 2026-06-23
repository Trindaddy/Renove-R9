import React from 'react';
import DOMPurify from 'dompurify';

/**
 * Componente seguro para renderização de HTML dinâmico,
 * higienizando o conteúdo para mitigar ataques de Cross-Site Scripting (XSS).
 */
export default function SanitizedHTML({ html, className = '' }) {
  const cleanHTML = DOMPurify.sanitize(html);
  
  return (
    <div 
      className={className} 
      dangerouslySetInnerHTML={{ __html: cleanHTML }} 
    />
  );
}
