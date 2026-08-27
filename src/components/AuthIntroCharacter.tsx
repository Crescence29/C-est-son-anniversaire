import React from 'react';

/**
 * Petite mise en scène décorative au-dessus des pages Connexion/Inscription :
 * un personnage arrive en marchant, en grand format au centre, avec un
 * gâteau d'anniversaire. Il s'arrête, une étincelle brille, puis il se
 * rétracte (rapetissit et remonte) pendant que le formulaire apparaît.
 * Purement visuel (aria-hidden), rejoue à chaque montage du composant
 * (changement de mode login/register/forgot).
 */
export const AuthIntroCharacter: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="relative h-40 sm:h-48 mb-2 flex items-end justify-center overflow-hidden pointer-events-none select-none"
    >
      {/* Sol / ombre */}
      <div className="auth-intro-ground absolute bottom-1 w-48 h-4 rounded-full bg-plum/15 blur-sm" />

      {/* Étincelle */}
      <svg
        viewBox="0 0 24 24"
        className="auth-intro-snap absolute top-6 left-1/2 translate-x-9 w-8 h-8"
      >
        <defs>
          <radialGradient id="snapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff3d0" />
            <stop offset="100%" stopColor="#e0a530" />
          </radialGradient>
        </defs>
        <path
          fill="url(#snapGlow)"
          d="M12 0l1.8 7.2L21 9l-7.2 1.8L12 18l-1.8-7.2L3 9l7.2-1.8L12 0z"
        />
      </svg>

      {/* Personnage (marche en grand, puis se rétracte vers le haut) */}
      <div className="auth-intro-character absolute bottom-1 left-1/2">
        <div className="auth-intro-character-bob drop-shadow-lg">
          <img
            src="/personnage-gateau.png"
            alt=""
            className="h-36 sm:h-44 w-auto"
          />
        </div>
      </div>
    </div>
  );
};
