-- Kambuyam Home : annonces de départ (partenaire Résidence Soft Time).
-- À exécuter APRÈS avoir créé ton compte sur le site et l'avoir passé admin (voir README).
-- Prix indicatifs, à confirmer avec le partenaire.
do $$
declare admin_id uuid;
begin
  select id into admin_id from public.profiles where role = 'admin' order by created_at limit 1;
  if admin_id is null then raise exception 'Crée d''abord un compte admin (voir README)'; end if;
  if exists (select 1 from public.listings where partner = 'Résidence Soft Time') then
    raise notice 'Annonces Soft Time déjà présentes, rien à faire'; return;
  end if;
  insert into public.listings (partner, title, type, city, area, mode, price, description, amenities, photos, featured, owner_id, status)
  select v.partner, v.title, v.type, v.city, v.area, v.mode, v.price, v.description, v.amenities::text[], v.photos, v.featured, admin_id, 'published' from (values
  ('Résidence Soft Time','Appartement #1, Soft Time','Appartement meublé','Douala','Bonamoussadi (Terminus)','nuit',35000,'Grand appartement meublé haut standing : salon spacieux avec coin repas, chambre lumineuse, cuisine équipée et salle d''eau.','{Climatisation,"Wifi gratuit","Écran plat","Cuisine équipée","Sécurité 24h/24","Accueil 24h/24"}',ARRAY['img/apt1-2.jpg','img/apt1-1.jpg','img/apt1-3.jpg','img/apt1-4.jpg','img/apt1-5.jpg','img/apt1-6.jpg','img/apt1-7.jpg','img/apt1-8.jpg','img/apt1-9.jpg','img/apt1-10.jpg'],true),
  ('Résidence Soft Time','Appartement #2, Soft Time','Appartement meublé','Douala','Bonamoussadi (Terminus)','nuit',35000,'Appartement meublé avec salon double, salle à manger, chambre climatisée, cuisine et salle d''eau.','{Climatisation,"Wifi gratuit","Écran plat","Cuisine équipée","Sécurité 24h/24","Accueil 24h/24"}',ARRAY['img/apt2-2.jpg','img/apt2-1.jpg','img/apt2-3.jpg','img/apt2-4.jpg','img/apt2-5.jpg','img/apt2-6.jpg','img/apt2-7.jpg','img/apt2-8.jpg','img/apt2-9.jpg','img/apt2-10.jpg'],false),
  ('Résidence Soft Time','Appartement #3, Soft Time','Appartement meublé','Douala','Bonamoussadi (Terminus)','nuit',35000,'Appartement meublé clair avec home cinéma, coin repas, chambre et cuisine équipée.','{Climatisation,"Wifi gratuit","Écran plat","Cuisine équipée","Sécurité 24h/24","Accueil 24h/24"}',ARRAY['img/apt3-1.jpg','img/apt3-2.jpg','img/apt3-3.jpg','img/apt3-4.jpg','img/apt3-5.jpg','img/apt3-6.jpg','img/apt3-7.jpg','img/apt3-8.jpg','img/apt3-9.jpg','img/apt3-10.jpg'],true),
  ('Résidence Soft Time','Appartement #4, Soft Time','Appartement meublé','Douala','Bonamoussadi (Terminus)','nuit',35000,'Appartement meublé avec grand salon, salle à manger, chambre, cuisine et salle d''eau.','{Climatisation,"Wifi gratuit","Écran plat","Cuisine équipée","Sécurité 24h/24","Accueil 24h/24"}',ARRAY['img/apt4-2.jpg','img/apt4-1.jpg','img/apt4-3.jpg','img/apt4-4.jpg','img/apt4-5.jpg','img/apt4-6.jpg','img/apt4-7.jpg','img/apt4-8.jpg','img/apt4-9.jpg','img/apt4-10.jpg'],false),
  ('Résidence Soft Time','Appartement #5, Soft Time','Appartement meublé','Douala','Bonamoussadi (Terminus)','nuit',40000,'Appartement meublé sur deux niveaux avec escalier intérieur, salon, chambre, cuisine et salle d''eau.','{Climatisation,"Wifi gratuit","Écran plat","Cuisine équipée","Sécurité 24h/24","Accueil 24h/24"}',ARRAY['img/apt5-2.jpg','img/apt5-1.jpg','img/apt5-3.jpg','img/apt5-4.jpg','img/apt5-5.jpg','img/apt5-6.jpg','img/apt5-7.jpg','img/apt5-8.jpg','img/apt5-9.jpg','img/apt5-10.jpg'],false),
  ('Résidence Soft Time','Chambre meublée, Soft Time','Chambre / studio','Douala','Bonamoussadi (Terminus)','nuit',20000,'Chambre meublée avec kitchenette (micro-ondes, réfrigérateur), télévision et salle d''eau privée.','{Climatisation,"Wifi gratuit","Écran plat",Kitchenette,"Sécurité 24h/24"}',ARRAY['img/chambre-3.jpg','img/chambre-1.jpg','img/chambre-2.jpg','img/chambre-4.jpg','img/chambre-5.jpg','img/chambre-6.jpg'],true)
  ) as v(partner, title, type, city, area, mode, price, description, amenities, photos, featured);
end $$;

-- Capacité indicative des logements Soft Time (à confirmer avec le partenaire).
update public.listings set max_guests = coalesce(max_guests, 2), bedrooms = coalesce(bedrooms, 1) where partner = 'Résidence Soft Time';
