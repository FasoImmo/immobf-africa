-- Ajoute les colonnes nécessaires pour que l'admin puisse réellement bloquer
-- un compte et forcer sa déconnexion (jusqu'ici aucune notion de blocage
-- n'existait en base — la page admin n'avait aucun moyen d'agir sur un
-- abonné, seulement de consulter des statistiques globales).
--
-- token_version : incrémenté à chaque blocage ou déconnexion forcée. Sa
-- valeur est embarquée dans les JWT (access ET refresh) au moment de la
-- signature ; requireAuth compare la valeur du token à celle en base et
-- rejette la requête si elles diffèrent — c'est ce qui permet une
-- déconnexion immédiate malgré des tokens stateless (pas de table de
-- sessions à gérer).
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users (is_blocked);
