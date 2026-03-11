// src/App.tsx
import { useState } from 'react';
import type { Rol } from './types';
import type { UsuarioLogin } from './services/supabaseService';
import ModalLogin from './Componentes/ModalLogin';
import SimuladorMapa from './Componentes/SimuladorMapa';

function App() {
  const [usuario, setUsuario] = useState<UsuarioLogin | null>(null);

  if (!usuario) {
    return <ModalLogin onLogin={(_, u) => setUsuario(u)} />;
  }

  return (
    <SimuladorMapa
      rolInicial={usuario.rol as Rol}
      nombreUsuario={usuario.nombre ?? usuario.email}
      onLogout={() => setUsuario(null)}
    />
  );
}

export default App;