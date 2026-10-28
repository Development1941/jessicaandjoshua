-- Final wedding list from "Final Guest List.csv".
-- Safe to re-run. Existing RSVPs are kept.
-- Invite rule: an x in one event column means that event only.
-- An x in Both means every event (tier both).
-- Brunch only -> tier brunch. Bar invite only -> tier night.
--
-- Expected after this runs: 90 guests
--   every event (both): 63
--   brunch only: 15
--   bar only (night): 12

begin;

alter table public.guests
  add column if not exists country_code text;

-- 562 is a US area code. The old row stored Mexico's 52 in front of it.
update public.guests
set phone = '5626447440',
    country_code = '1'
where phone in ('525626447440', '5215626447440');

-- Mark Salvie
update public.guests
set phone = null,
    country_code = '1',
    first_name = 'Mark',
    last_name = 'Salvie',
    addressee = 'The Kramer Family',
    name = 'Mark Salvie',
    tier = 'both',
    email = coalesce(nullif(email, ''), 'marksalvie@gmail.com')
where lower(name) = 'mark salvie' or lower(email) = 'marksalvie@gmail.com' or phone = '4696443647' or (phone = '8329717488' and lower(name) like '%mark salvie%');

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
select null, 'marksalvie@gmail.com', '1', 'Mark', 'Salvie', 'The Kramer Family', 'Mark Salvie', 'both'
where not exists (
  select 1 from public.guests
  where lower(name) = 'mark salvie' or lower(email) = 'marksalvie@gmail.com'
);

-- Chris Nguyen
update public.guests
set phone = null,
    country_code = null,
    first_name = 'Chris',
    last_name = 'Nguyen',
    addressee = 'Chris Nguyen',
    name = 'Chris Nguyen',
    tier = 'night',
    email = coalesce(nullif(email, ''), null)
where lower(name) = 'chris nguyen';

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
select null, null, null, 'Chris', 'Nguyen', 'Chris Nguyen', 'Chris Nguyen', 'night'
where not exists (
  select 1 from public.guests
  where lower(name) = 'chris nguyen'
);

-- Michael Viviano
update public.guests
set phone = null,
    country_code = null,
    first_name = 'Michael',
    last_name = 'Viviano',
    addressee = 'Michael Viviano',
    name = 'Michael Viviano',
    tier = 'night',
    email = coalesce(nullif(email, ''), null)
where lower(name) = 'michael viviano';

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
select null, null, null, 'Michael', 'Viviano', 'Michael Viviano', 'Michael Viviano', 'night'
where not exists (
  select 1 from public.guests
  where lower(name) = 'michael viviano'
);

-- Abuelita Rodriguez
update public.guests
set phone = null,
    country_code = null,
    first_name = 'Abuelita',
    last_name = 'Rodriguez',
    addressee = 'Abuelita Rodriguez',
    name = 'Abuelita Rodriguez',
    tier = 'brunch',
    email = coalesce(nullif(email, ''), null)
where lower(name) = 'abuelita rodriguez';

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
select null, null, null, 'Abuelita', 'Rodriguez', 'Abuelita Rodriguez', 'Abuelita Rodriguez', 'brunch'
where not exists (
  select 1 from public.guests
  where lower(name) = 'abuelita rodriguez'
);

-- Lloyd Luco
update public.guests
set phone = null,
    country_code = null,
    first_name = 'Lloyd',
    last_name = 'Luco',
    addressee = 'Lloyd Luco',
    name = 'Lloyd Luco',
    tier = 'brunch',
    email = coalesce(nullif(email, ''), null)
where lower(name) = 'lloyd luco';

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
select null, null, null, 'Lloyd', 'Luco', 'Lloyd Luco', 'Lloyd Luco', 'brunch'
where not exists (
  select 1 from public.guests
  where lower(name) = 'lloyd luco'
);

insert into public.guests (
  phone, email, country_code, first_name, last_name, addressee, name, tier
)
values
  ('7133033129', null, '1', 'Everardo', 'Rodriguez', 'Mr. & Mrs Rodriguez', 'Everardo Rodriguez', 'brunch'),
  ('7134474591', 'kristeen.n.rodriguez@gmail.com', '1', 'Kristeen', 'Joiner', 'Blake & Kristeen Joiner', 'Kristeen Joiner', 'both'),
  ('8322571081', null, '1', 'Esther', 'Ibarra', 'Mr. & Mrs. Ibarra', 'Esther Ibarra', 'brunch'),
  ('8328201130', 'jacobibarra@gmail.com', '1', 'Jacob', 'Ibarra', 'Ibarra Fam', 'Jacob Ibarra', 'both'),
  ('8324043499', 'hrod1964@sbcglobal.net', '1', 'Hector', 'Rodriguez', 'Mr. & Mrs. Hector Rodriguez & family', 'Hector Rodriguez', 'brunch'),
  ('7135049708', 'rousyrod70@gmail.com', '1', 'Mario', 'Rodriguez', 'The Rodriguez Family', 'Mario Rodriguez', 'brunch'),
  ('2818146934', 'alrod33@hotmail.com', '1', 'Albert', 'Rodriguez', 'Albert Rodriguez and Gabby Triveline', 'Albert Rodriguez', 'both'),
  ('8324777411', null, '1', 'Tina', 'Buchanan', 'Tina Buchanan', 'Tina Buchanan', 'brunch'),
  ('2818142428', null, '1', 'Jonathan', 'Buchanan', 'Buchanan Family', 'Jonathan Buchanan', 'both'),
  ('3108445126', 'exayana8@gmail.com', '1', 'Victor', 'Rodriguez', 'Victor Rodriguez and Family', 'Victor Rodriguez', 'brunch'),
  ('2146625555', 'ricardor@dallascoolpools.com', '1', 'Ricardo', 'Rodriguez', 'The Rodriguez Family', 'Ricardo Rodriguez', 'brunch'),
  ('7132036077', null, '1', 'Gonzalo', 'Ochoa', 'Mr. & Mrs. Ochoa', 'Gonzalo Ochoa', 'brunch'),
  ('8326073778', 'berzayda@yahoo.com', '1', 'Berzayda', 'Ochoa', 'The Rodriguez Family', 'Berzayda Ochoa', 'both'),
  ('7133781088', 'janelle90@hotmail.com', '1', 'Gonzalo', 'Ochoa III', 'The Ochoa-Rosales Family', 'Gonzalo Ochoa III', 'both'),
  ('7138262507', null, '1', 'Estela', 'Rahman', 'Mrs. Rahman', 'Estela Rahman', 'brunch'),
  ('2818767882', 'sosamadalyn98@gmail.com', '1', 'Joshua', 'Rahman', 'The Rahman Family', 'Joshua Rahman', 'both'),
  ('7138268731', 'sasharahman123@icloud.com', '1', 'Sasha', 'Rahman', 'The Ramirez Family', 'Sasha Rahman', 'both'),
  ('8325663799', 'jesna93@yahoo.com', '1', 'Jesna', 'Mathews', 'The Mathews Family', 'Jesna Mathews', 'both'),
  ('4238274000', 'nataliemwalker97@gmail.com', '1', 'Natalie', 'Walker', 'Natalie Walker & Hunter Hambright', 'Natalie Walker', 'both'),
  ('8327941798', 'samihunt97@gmail.com', '1', 'Samantha', 'Hunt', 'Samantha Hunt', 'Samantha Hunt', 'both'),
  ('3305757872', 'englandcalais@gmail.com', '1', 'England', 'Todd', 'England Todd & Patrick Butler', 'England Todd', 'both'),
  ('2165389565', 'bianca.n.badescu@gmail.com', '1', 'Bianca', 'Badescu', 'The Pogues', 'Bianca Badescu', 'both'),
  ('7244178255', 'meganringledew@gmail.com', '1', 'Megan', 'Marron', 'The Marron Family', 'Megan Marron', 'both'),
  ('9524121730', 'ktstubenrouch@gmail.com', '1', 'Katelyn', 'Stubenrouch', 'The Stubenrouch Family', 'Katelyn Stubenrouch', 'both'),
  ('7138166619', 'bridgettfalcone@yahoo.com', '1', 'Bridgett', 'Falcone', 'The Heisers', 'Bridgett Falcone', 'both'),
  ('8326603434', 'timcaws@hotmail.com', '1', 'Tim', 'Caws', 'Libby Gravatt & Tim Caws', 'Tim Caws', 'both'),
  ('8329717488', 'emerianos21@gmail.com', '1', 'Eleni', 'Kramer', 'The Kramer Family', 'Eleni Kramer', 'both'),
  ('2817702719', 'robcerni@gmail.com', '1', 'Rob', 'Erni', 'Rob Erni & Diandra Breen', 'Rob Erni', 'both'),
  ('9794924118', 'racoffman@gmail.com', '1', 'Rob', 'Coffman', 'The Rob Coffman', 'Rob Coffman', 'both'),
  ('7134479685', 'jeff.brannigan@gmail.com', '1', 'Jeff', 'Brannigan', 'Katie & Jeff Brannigan', 'Jeff Brannigan', 'both'),
  ('8326128277', 'dane.thorwaldson@gmail.com', '1', 'Dane', 'Thorwaldson', 'Dane Thorwaldson', 'Dane Thorwaldson', 'both'),
  ('8327296266', 'sako@tajianent.com', '1', 'Sako', 'Tajian', 'The Tajian Family', 'Sako Tajian', 'both'),
  ('5626447440', 'luis11parra@gmail.com', '1', 'Luis', 'Parra', 'The Parra''s', 'Luis Parra', 'both'),
  ('8166957734', null, '1', 'Hesse', 'McGraw', 'Cobi Newton & Hesse McGraw', 'Hesse McGraw', 'both'),
  ('4106934525', 'm.arroyo20@gmail.com', '1', 'Camila', 'Topke', 'Arroyo Topke', 'Camila Topke', 'both'),
  ('9792045891', 'afmaqui@gmail.com', '1', 'Augus', 'Maqui', 'The Maqui Family', 'Augus Maqui', 'both'),
  ('8327293364', 'nicolebhatnagar@gmail.com', '1', 'Nicole', 'Bhatnagar', 'Nicole & Sina', 'Nicole Bhatnagar', 'both'),
  ('7243163508', 'lauren.mcginnity@gmail.com', '1', 'Lauren', 'McGinnity', 'Lauren McGinnity', 'Lauren McGinnity', 'both'),
  ('6178958651', 'dmedinaarango@outlook.com', '1', 'Daniela', 'Medina', 'The Medina Party', 'Daniela Medina', 'both'),
  ('7134800797', 'joshuaespinedo@gmail.com', '1', 'Joshua', 'Espiñedo', 'Joshua Espiñedo & Nathan Reedy', 'Joshua Espiñedo', 'both'),
  ('7138946687', 'jacsmith90@gmail.com', '1', 'Jackson', 'Smith', 'Stephanie & Jackson Smith', 'Jackson Smith', 'both'),
  ('7132568086', 'bobby@anvilhouston.com', '1', 'Bobby', 'Heugel', 'Bobby Heugel', 'Bobby Heugel', 'both'),
  ('8327416772', 'brandilisenbe@gmail.com', '1', 'Brandi', 'Garcia', 'Bouzas Garcia Fam', 'Brandi Garcia', 'both'),
  ('8323681922', 'jaclynd6@gmail.com', '1', 'Jaclyn', 'Diaz', 'Jaclyn Diaz', 'Jaclyn Diaz', 'both'),
  ('8324234571', 'kelgarci@gmail.com', '1', 'Kelly', 'Garcia', 'Kelly Garcia & Taylor Hastings', 'Kelly Garcia', 'both'),
  ('7344762586', 'rick.d.rauser@gmail.com', '1', 'Rick', 'Rauser', 'The Rausers', 'Rick Rauser', 'both'),
  ('3253403870', 'levi.lemaster@gmail.com', '1', 'Levi', 'Lemaster', 'Lemaster Residence', 'Levi Lemaster', 'both'),
  ('8323061158', null, '1', 'Ben', 'Acherly', 'The Ackerley''s', 'Ben Acherly', 'both'),
  ('7134433398', 'george@georgejohnston.com', '1', 'George', 'Johnson', 'George + Jaime', 'George Johnson', 'both'),
  ('6128893778', 'carl.hollimon@gmail.com', '1', 'Carl', 'Hollimon', 'The Hollimon’s', 'Carl Hollimon', 'both'),
  ('8328510569', 'connorlwalsh@gmail.com', '1', 'Connor', 'Walsh', 'Connor & Chae Eun', 'Connor Walsh', 'both'),
  ('7132014409', 'rakheebdas@gmail.com', '1', 'Rahkee', 'Das', 'Das', 'Rahkee Das', 'brunch'),
  ('7133046660', 'bspecto@gmail.com', '1', 'Bryan', 'Spector', 'Mr. & Mrs. Spector', 'Bryan Spector', 'brunch'),
  ('7138281877', 'michael.bassila@gmail.com', '1', 'Michael', 'Bassila', 'The Bassila’s', 'Michael Bassila', 'both'),
  ('2817321792', 'kevinwschott@gmail.com', '1', 'Kevin', 'Schott', 'Schott Family', 'Kevin Schott', 'both'),
  ('8323024437', 'grace@tinyboxwoods.com', '1', 'Grace', 'Mihardja', 'Grace Mihardja', 'Grace Mihardja', 'night'),
  ('8325451722', null, '1', 'Josh', 'Pierre', 'Josh Pierre', 'Josh Pierre', 'night'),
  ('2817066339', 'joses28sanchezfernandez@gmail.com', '1', 'Jose', 'Sanchez', 'Sanchez Family', 'Jose Sanchez', 'both'),
  ('7134431878', 'wells.ian@gmail.com', '1', 'Ian', 'Wells', 'Ian Wells', 'Ian Wells', 'night'),
  ('7328042996', 'lindsaybdouglas@gmail.com', '1', 'Michael', 'Meir', 'The Meirs', 'Michael Meir', 'night'),
  ('7137572459', 'vela.acody@gmail.com', '1', 'Cody', 'Vela', 'The Vela-Black Family', 'Cody Vela', 'night'),
  ('5122844977', null, '1', 'John', 'Humphreys', 'John Humphreys', 'John Humphreys', 'night'),
  ('8326332870', 'bethsorensen76@gmail.com', '1', 'Carl', 'Sorensen', 'The Sorensen Family', 'Carl Sorensen', 'both'),
  ('4096733092', null, '1', 'Micah', 'Bickham', 'The Bickham’s', 'Micah Bickham', 'both'),
  ('7132568318', 'jharb@jharb.com', '1', 'Justy', 'Harbison', 'Mr. & Mrs. Justin Harbison', 'Justy Harbison', 'both'),
  ('7136287064', 'wesdillard@gmail.com', '1', 'Wes', 'Dillard', 'Ashley & Wes Dillard', 'Wes Dillard', 'both'),
  ('2027665636', 'willdanielsonlanier@gmail.com', '1', 'Will', 'Danielson Lanier', 'Danielson Laniers', 'Will Danielson Lanier', 'both'),
  ('8329696288', null, '1', 'Jonathan', 'Armor', 'The Armour Family', 'Jonathan Armor', 'both'),
  ('8323315150', null, '1', 'Presley', 'Collins', 'Collins Family', 'Presley Collins', 'both'),
  ('8326872619', null, '1', 'Matt', 'Goodwin', 'Matt & Hillary Goodwin', 'Matt Goodwin', 'both'),
  ('4696443758', 'jsalvie@gmail.com', '1', 'John', 'Salvie', 'The Salvie Family', 'John Salvie', 'night'),
  ('2819246360', 'brentnettles@gmail.com', '1', 'Brent', 'Nettles', 'Brent Nettles', 'Brent Nettles', 'both'),
  ('2816842620', 'tomlynchmusic@gmail.com', '1', 'Tom', 'Lynch', 'The Lynches', 'Tom Lynch', 'both'),
  ('8323871576', 'felipe.l.riccio@gmail.com', '1', 'Felipe', 'Riccio', 'Riccio Family', 'Felipe Riccio', 'night'),
  ('8324849939', 'herrera.al.cr@gmail.com', '1', 'Alejandro', 'Herrera', 'Mr. & Mrs. Herrera', 'Alejandro Herrera', 'both'),
  ('8324639446', 'blakeelliottlupton@gmail.com', '1', 'Blake', 'Lupton', 'The Lupton’s', 'Blake Lupton', 'night'),
  ('9172940314', 'spellizzer@gmail.com', '1', 'Sebastiano', 'Pellizzer', 'Pellizzer’s', 'Sebastiano Pellizzer', 'both'),
  ('8328146555', 'caralambright@yahoo.com', '1', 'Cara', 'Lambright', 'Ms. Cara Lambright', 'Cara Lambright', 'both'),
  ('7360601228', 'jerome.milongo@gmail.com', '44', 'Jerome', 'Milongo', 'Natalia Rachlin & Jerome Milongo', 'Jerome Milongo', 'both'),
  ('8324526796', 'pierce.bush@gmail.com', '1', 'Pierce', 'Bush', 'The Bush Family', 'Pierce Bush', 'both'),
  ('4158714536', 'zanepramirez@yahoo.com', '1', 'Zane', 'Ramirez', 'Zane Ramirez', 'Zane Ramirez', 'night'),
  ('7133034636', null, '1', 'Jessika', 'Rodriguez', 'Jessika Rodriguez', 'Jessika Rodriguez', 'both'),
  ('8327978346', 'j.ibarra1985@gmail.com', '1', 'Joshua', 'Ibarra', 'Joshua Ibarra', 'Joshua Ibarra', 'both'),
  ('9709037755', null, '1', 'Mr. & Mrs.', 'Little', 'Mr. & Mrs. Little', 'Mr. & Mrs. Little', 'brunch'),
  ('7137256407', null, '1', 'Irene', 'Pina', 'Irene Pina', 'Irene Pina', 'brunch')
on conflict (phone) do update
set country_code = excluded.country_code,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    addressee = excluded.addressee,
    name = excluded.name,
    tier = excluded.tier,
    email = coalesce(nullif(public.guests.email, ''), excluded.email);

delete from public.guests g
where not (
  (g.phone is not null and g.phone in ('7133033129', '7134474591', '8322571081', '8328201130', '8324043499', '7135049708', '2818146934', '8324777411', '2818142428', '3108445126', '2146625555', '7132036077', '8326073778', '7133781088', '7138262507', '2818767882', '7138268731', '8325663799', '4238274000', '8327941798', '3305757872', '2165389565', '7244178255', '9524121730', '7138166619', '8326603434', '8329717488', '2817702719', '9794924118', '7134479685', '8326128277', '8327296266', '5626447440', '8166957734', '4106934525', '9792045891', '8327293364', '7243163508', '6178958651', '7134800797', '7138946687', '7132568086', '8327416772', '8323681922', '8324234571', '7344762586', '3253403870', '8323061158', '7134433398', '6128893778', '8328510569', '7132014409', '7133046660', '7138281877', '2817321792', '8323024437', '8325451722', '2817066339', '7134431878', '7328042996', '7137572459', '5122844977', '8326332870', '4096733092', '7132568318', '7136287064', '2027665636', '8329696288', '8323315150', '8326872619', '4696443758', '2819246360', '2816842620', '8323871576', '8324849939', '8324639446', '9172940314', '8328146555', '7360601228', '8324526796', '4158714536', '7133034636', '8327978346', '9709037755', '7137256407'))
  or (g.phone is null and lower(g.name) in ('mark salvie', 'chris nguyen', 'michael viviano', 'abuelita rodriguez', 'lloyd luco'))
);

do $$
declare
  total_count int;
  both_count int;
  brunch_count int;
  night_count int;
  phone_count int;
begin
  select count(*) into total_count from public.guests;
  select count(*) into both_count from public.guests where tier = 'both';
  select count(*) into brunch_count from public.guests where tier = 'brunch';
  select count(*) into night_count from public.guests where tier = 'night';
  select count(*) into phone_count from public.guests where phone is not null;
  if total_count <> 90
     or both_count <> 63
     or brunch_count <> 15
     or night_count <> 12
     or phone_count <> 85 then
    raise exception
      'Guest list check failed. total=%, both=%, brunch=%, night=%, phones=%',
      total_count, both_count, brunch_count, night_count, phone_count;
  end if;
end $$;

commit;
