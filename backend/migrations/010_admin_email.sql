-- Migration 010 : migrer le compte admin vers le domaine fonctionnel
-- L'ancien email admin@immobf.africa ne reçoit aucun mail (domaine non
-- configuré). On le remplace par contact@immoafrica.online afin que le
-- flux "mot de passe oublié" (par email) fonctionne pour ce compte.
-- Le mot de passe par défaut du seed (admin2026) reste en place jusqu'à ce
-- que l'administrateur le réinitialise lui-même via /forgot-password.
UPDATE users
SET email = 'contact@immoafrica.online'
WHERE email = 'admin@immobf.africa' AND role = 'admin';
