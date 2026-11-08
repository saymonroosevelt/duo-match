import { useEffect, useState } from 'react';
import { initials } from '../lib/helpers';

const SIZES = {
  xs: 'w-8 h-8 text-[10px]',
  sm: 'w-10 h-10 text-xs',
  md: 'w-14 h-14 text-lg',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-28 h-28 text-4xl',
};

export default function Avatar({
  src,
  name,
  size = 'md',
  className = '',
  ring = true,
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const base = `${SIZES[size] || SIZES.md} shrink-0 rounded-full object-cover ${
    ring ? 'ring-1 ring-white/10' : ''
  } ${className}`;

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || 'Foto de perfil'}
        className={base}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div
      className={`${base} bg-[#3a1018] flex items-center justify-center font-serif text-rose-100/90`}
      aria-label={name || 'Sem foto'}
    >
      {initials(name)}
    </div>
  );
}
