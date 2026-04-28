/** @format */

// src/Componentes/Footer.tsx
// Barra de créditos fija — Tailwind CSS — siempre visible debajo de la cola

export const Footer = () => {
	return (
		<footer className='shrink-0 w-full bg-[#0a0f1e] border-t border-slate-800 z-30'>
			<div className='md:hidden flex flex-col px-3 py-2 gap-2'>
				<div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
					<div className='flex items-center gap-2 min-w-0'>
						<span className='text-slate-600 text-xs'>👤</span>
						<div className='min-w-0 leading-tight'>
                      <span className='text-slate-300 font-semibold block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Marco David Vasquez Guevara
                      </span>
							<span className='text-slate-500 block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>

					<div className='flex items-center gap-2 min-w-0'>
						<span className='text-slate-600 text-xs'>💻</span>
						<div className='min-w-0 leading-tight'>
                      <span className='text-slate-300 font-semibold block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Luis Kevin Paiva Silva
                      </span>
							<span className='text-slate-500 block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>

					<div className='flex items-center gap-2 min-w-0'>
						<span className='text-slate-600 text-xs'>👤</span>
						<div className='min-w-0 leading-tight'>
                      <span className='text-slate-300 font-semibold block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Alex Jamir Torres Cajo
                      </span>
							<span className='text-slate-500 block truncate' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>
				</div>

				<div className='flex items-center justify-end gap-1 shrink-0 pt-1 border-t border-slate-800/50'>
					<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse' />
					<span className='text-slate-400 font-medium' style={{ fontSize: 'clamp(0.55rem, 2vw, 0.65rem)' }}>
                   Conectado · Supabase
                </span>
				</div>
			</div>

			<div className='hidden md:flex items-center justify-between px-6 py-2 gap-4'>
				<div className='flex flex-1 items-center justify-center gap-6'>
					<div className='flex items-center gap-3 min-w-0'>
						<span className='text-slate-600 text-xs'>👤</span>
						<div className='flex flex-col leading-tight'>
                      <span className='text-slate-300 text-xs font-semibold truncate'>
                         Marco David Vasquez Guevara
                      </span>
							<span className='text-slate-500 text-[0.65rem] truncate'>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>

					<div className='w-px h-6 bg-slate-700 shrink-0' />

					<div className='flex items-center gap-3 min-w-0'>
						<span className='text-slate-600 text-xs'>💻</span>
						<div className='flex flex-col leading-tight'>
                      <span className='text-slate-300 text-xs font-semibold truncate'>
                         Luis Kevin Paiva Silva
                      </span>
							<span className='text-slate-500 text-[0.65rem] truncate'>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>

					<div className='w-px h-6 bg-slate-700 shrink-0' />

					<div className='flex items-center gap-3 min-w-0'>
						<span className='text-slate-600 text-xs'>👤</span>
						<div className='flex flex-col leading-tight'>
                      <span className='text-slate-300 text-xs font-semibold truncate'>
                         Alex Jamir Torres Cajo
                      </span>
							<span className='text-slate-500 text-[0.65rem] truncate'>
                         Estudiante universitario UTP
                      </span>
						</div>
					</div>
				</div>

				<div className='flex items-center gap-2 shrink-0 pl-4 border-l border-slate-700'>
					<span className='w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse' />
					<span className='text-slate-400 text-[0.65rem] font-medium'>
                   Conectado · Supabase PostgreSQL
                </span>
				</div>
			</div>
		</footer>
	);
};