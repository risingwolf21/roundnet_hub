-- Admin tool "Playerzone-Daten neu laden": reloads RG-Index, avatar and Pro status of every player with an RG ID.
-- The fetch-player-info edge function checks it (or supabase.admin) with the caller's JWT.
INSERT INTO public.permissions (name, description)
VALUES ('playerzone.refresh', 'Erlaubt, RG-Index, Profilbild und Pro-Status aller Spieler neu von Playerzone zu laden.')
ON CONFLICT (name) DO NOTHING;
