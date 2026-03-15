/** @format */

// src/Componentes/Footer.tsx
// Barra de créditos fija — Tailwind CSS — siempre visible debajo de la cola

export const Footer = () => {
	return (
		<footer className='shrink-0 w-full bg-[#0a0f1e] border-t border-slate-800 z-30'>
			<div className='md:hidden flex flex-col px-3 py-1 gap-1'>
				<div className='flex items-center gap-2 min-w-0'>
					<span className='text-slate-600 text-xs'>👤</span>
					<div className='min-w-0 leading-tight'>
						<span className='text-slate-300 font-semibold block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
							Anthony Michael Paiva Silva
						</span>
						<span className='text-slate-500 block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
							Asistente Logístico · T1 Peak Season
						</span>
					</div>
				</div>

				<div className='flex items-center gap-2 min-w-0'>
					<span className='text-slate-600 text-xs'>🖥️</span>
					<div className='min-w-0 leading-tight flex-1'>
						<span className='text-slate-300 font-semibold block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
							Luis Kevin Paiva Silva
						</span>
						<span className='text-slate-500 block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
							Consultor Programador
						</span>
					</div>
					<div className='flex items-center gap-1 shrink-0'>
						<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse' />
						<span className='text-slate-400 font-medium' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
							Conectado
						</span>
					</div>
				</div>
			</div>

			<div className='hidden md:flex items-center justify-between px-6 py-1.5 gap-4'>
				<div className='flex items-center gap-3 min-w-0'>
					<span className='text-slate-600 text-xs'>👤</span>
					<div className='flex flex-col leading-tight'>
						<span className='text-slate-300 text-xs font-semibold truncate'>
							Anthony Michael Paiva Silva
						</span>
						<span className='text-slate-500 text-[0.65rem] truncate'>
							Asistente Logístico · T1 Peak Season
						</span>
					</div>
				</div>

				<div className='hidden sm:block w-px h-6 bg-slate-700 shrink-0' />

				<div className='flex items-center gap-3 min-w-0'>
					<span className='text-slate-600 text-xs'>💻</span>
					<div className='flex flex-col leading-tight'>
						<span className='text-slate-300 text-xs font-semibold truncate'>
							Luis Kevin Paiva Silva
						</span>
						<span className='text-slate-500 text-[0.65rem] truncate'>
							Consultor Programador
						</span>
					</div>
				</div>

				<div className='hidden sm:block w-px h-6 bg-slate-700 shrink-0' />

				<div className='flex items-center gap-2 shrink-0'>
					<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse' />
					<span className='text-slate-400 text-[0.65rem] font-medium'>
						Conectado · Supabase PostgreSQL
					</span>
				</div>
			</div>
		</footer>
	);
};
