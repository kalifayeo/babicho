-- ============================================================
-- BABICHO — Raison / message facultatif d'une contribution
-- ============================================================
-- Sur une cause solidaire (don, cotisation), le contributeur peut, s'il le
-- souhaite, laisser une courte raison ou un message au moment de payer. Il est
-- affiché dans la liste publique des contributions (aucun nom complet ni numéro).
--
-- La colonne est écrite UNIQUEMENT par le serveur (POST /api/orders, clé
-- service_role) après validation (longueur, caractères, événement de type
-- « cause »). Elle reste NULL quand la personne ne met rien.
-- ============================================================

alter table orders add column if not exists contribution_note text;

alter table orders drop constraint if exists orders_contribution_note_length;
alter table orders
  add constraint orders_contribution_note_length
  check (contribution_note is null or char_length(contribution_note) between 1 and 140);
