-- BUG (30/06/2026) : l'email saisi par le client dans le formulaire de
-- paiement (PaymentDialog "Email recommandé pour le reçu") n'était transmis
-- qu'au prestataire de paiement (FedaPay/Flutterwave/PayDunya), jamais
-- enregistré sur la transaction. L'envoi du reçu se basait ensuite UNIQUEMENT
-- sur l'email du compte (buyer.email) — si le compte n'avait pas d'email
-- (inscrit avant que l'email soit obligatoire) ou si le client avait saisi
-- une autre adresse à la caisse, aucun email ne partait, alors que l'UI
-- affichait quand même "Un reçu vous a été envoyé par email".
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_email TEXT;
