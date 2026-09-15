import React from 'react';
import { Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message: string;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ message }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-fond text-ink text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-full bg-cortex-red/10 flex items-center justify-center mx-auto mb-5">
          <Wrench className="w-7 h-7 text-cortex-red" />
        </div>
        <h1 className="text-xl font-bold mb-2">Site en maintenance</h1>
        <p className="text-sm text-ink/70 mb-6">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-full bg-cortex-red text-white font-semibold text-sm"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
};
