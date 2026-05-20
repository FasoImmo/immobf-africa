-- Migration 005 : ajout du numéro WhatsApp optionnel sur les utilisateurs
-- Si null, le frontend utilise le numéro de téléphone d'inscription par défaut.

ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
