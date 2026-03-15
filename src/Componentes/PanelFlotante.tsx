// src/Componentes/PanelFlotante.tsx
// Panel inocultable — position absolute en zona muerta del mapa
// Tailwind CSS + modo oscuro
import type { CSSProperties, ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
  style?: CSSProperties;          // para top/left vía posición absoluta precisa
  darkMode?: boolean;
}

const PanelFlotante = ({ titulo, children, style, darkMode = true }: Props) => {
  return (
    <div
      className={`
        lg:absolute relative z-[25] rounded-xl
        border-t-2 border-sky-400/40
        backdrop-blur-xl
        transition-colors duration-300
        ${darkMode
          ? 'bg-black/75 border border-slate-600/20 shadow-[0_8px_28px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)] text-slate-200'
          : 'bg-white/90 border border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.12)] text-slate-800'}
      `}
      style={{
        padding: 'clamp(8px,1vh,14px) clamp(10px,1.2vw,18px)',
        ...style,
      }}
    >
      {/* Título */}
      <div className="text-sky-400 font-bold tracking-widest uppercase opacity-85 mb-2"
        style={{ fontSize: 'clamp(0.55rem,0.68vw,0.65rem)' }}>
        {titulo}
      </div>
      {/* Contenido */}
      <div>{children}</div>
    </div>
  );
};

export default PanelFlotante;
