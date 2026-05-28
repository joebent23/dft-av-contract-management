import { NavLink, Route, Routes } from 'react-router-dom';
import ContractsList from './routes/ContractsList';
import ContractEdit from './routes/ContractEdit';
import Audit from './routes/Audit';
import Settings from './routes/Settings';

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `px-3 py-2 text-sm rounded-md transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs px-4 py-1.5 text-center">
        Proof-of-concept — writes directly to <code>joebent23/dft-av-contract-management</code> via your PAT. Single-user demo only.
      </div>

      <header className="border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <div className="font-semibold">DFT-AV Contracts</div>
          <nav className="flex gap-1">
            <NavItem to="/">Contracts</NavItem>
            <NavItem to="/audit">Audit</NavItem>
            <NavItem to="/settings">Settings</NavItem>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ContractsList />} />
          <Route path="/contracts/:id" element={<ContractEdit />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>

      <footer className="border-t border-border text-xs text-muted-foreground px-4 py-3 text-center">
        PoC · MIT · ODCS-based · GitHub Pages
      </footer>
    </div>
  );
}
