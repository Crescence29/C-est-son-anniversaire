-- ==========================================================
-- Migration 002: Realistic Seed Data for "C'est son anniversaire"
-- ==========================================================

-- Password hash for 'password123' generated with bcrypt
-- $2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m

-- Categories (5 categories)
INSERT INTO categories (id, name, slug, description, image_url, icon_name, commission_rate, is_active) VALUES
('cat-1', 'Dédicace', 'dedicace', 'Messages chaleureux, vœux en direct et mots personnalisés diffusés lors de nos émissions.', '/catalogue/dedicace/d%C3%A9dicace1.jpg', 'edit_square', 15.00, 1),
('cat-2', 'Chant', 'chant', 'Sérénades personnalisées, refrains d’anniversaire sur mesure et solos live émouvants.', '/catalogue/chants/chant1.jpg', 'mic', 20.00, 1),
('cat-3', 'Cadeau', 'cadeau', 'Gâteaux d’exception, bouquets féeriques et coffrets souvenirs livrés en mains propres.', '/catalogue/cadeaux/cadeaux4.avif', 'redeem', 10.00, 1),
('cat-4', 'Appel surprise', 'appel-surprise', 'Coups de fil complices en plein direct radio/télévision avec l’animateur et nos invités.', '/catalogue/appels/appel3.jpg', 'call', 15.00, 1),
('cat-5', 'Surprise complète', 'surprise-complete', 'Expérience immersive haut de gamme combinant dédicace, chant, cadeau et diffusion VIP.', '/catalogue/suprise%20complet/supprise2.jpg', 'celebration', 25.00, 1);

-- Commissions defaults
INSERT INTO commissions (id, category_id, rate) VALUES
('com-1', 'cat-1', 15.00),
('com-2', 'cat-2', 20.00),
('com-3', 'cat-3', 10.00),
('com-4', 'cat-4', 15.00),
('com-5', 'cat-5', 25.00);

-- Users (1 Admin, 2 Staff, 10 Clients)
INSERT INTO users (id, full_name, email, phone, password_hash, role, status, avatar_url) VALUES
('usr-admin', 'Marc Aurèle (Directeur)', 'admin@anniversaire.app', '+225 0700000001', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'admin', 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),
('usr-staff-1', 'Aïcha Traoré (Régie Émission)', 'staff1@anniversaire.app', '+225 0700000002', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'staff', 'active', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'),
('usr-staff-2', 'David Kouassi (Chanteur & Animateur)', 'staff2@anniversaire.app', '+225 0700000003', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'staff', 'active', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
('usr-client-1', 'Sophie Mensah', 'sophie.mensah@gmail.com', '+225 0501020304', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'),
('usr-client-2', 'Jean-Luc Yao', 'jeanluc.yao@gmail.com', '+225 0502030405', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'),
('usr-client-3', 'Fatou Cissé', 'fatou.cisse@gmail.com', '+225 0503040506', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'),
('usr-client-4', 'Patrick N’Goran', 'patrick.ngoran@gmail.com', '+225 0504050607', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80'),
('usr-client-5', 'Aminata Diallo', 'aminata.diallo@gmail.com', '+225 0505060708', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80'),
('usr-client-6', 'Emmanuel Koffi', 'emmanuel.koffi@gmail.com', '+225 0506070809', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80'),
('usr-client-7', 'Béatrice Touré', 'beatrice.toure@gmail.com', '+225 0507080910', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80'),
('usr-client-8', 'Serge Diabaté', 'serge.diabate@gmail.com', '+225 0508091011', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80'),
('usr-client-9', 'Christelle Bamba', 'christelle.bamba@gmail.com', '+225 0509101112', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80'),
('usr-client-10', 'Alexandre Zadi', 'alexandre.zadi@gmail.com', '+225 0510111213', '$2a$10$w0vH5bL/tK6tqY5eX.2VeuuY2p0kE2fS2C9xQhEeV1dE3zXwK1u7m', 'client', 'active', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80');

-- 30 Services (6 per Category)
INSERT INTO services (id, category_id, name, slug, description, short_description, price, currency, delay_label, image_url, is_available, is_featured) VALUES
-- Dédicaces (6)
('srv-1', 'cat-1', 'Dédicace simple en émission', 'dedicace-simple-emission', 'Lecture de votre message d’anniversaire en direct par l’animateur vedette pendant la tranche spéciale.', 'Message doux lu en direct à l’antenne', 10000.00, 'FCFA', '12h', '/catalogue/dedicace/d%C3%A9dicace3.jpg', 1, 1),
('srv-2', 'cat-1', 'Dédicace premium avec message long', 'dedicace-premium-message-long', 'Un texte poétique et personnalisé d’une minute lu avec accompagnement musical acoustique doux en plateau.', 'Texte émouvant d’une minute sur fond musical', 20000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-3', 'cat-1', 'Dédicace avec photo affichée', 'dedicace-photo-affichee', 'Votre dédicace lue avec diffusion de la plus belle photo du jubilaire sur grand écran et bandeau télévisé.', 'Message lu avec affichage grand écran de la photo', 25000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-4', 'cat-1', 'Dédicace spéciale famille', 'dedicace-speciale-famille', 'Un hommage collégial rassemblant les messages de tous les membres de la famille avec habillage spécial.', 'Hommage chaleureux réunissant toute la famille', 30000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-5', 'cat-1', 'Dédicace surprise minute', 'dedicace-surprise-minute', 'Programmation prioritaire et passage en moins de 3 heures pour ne jamais rater l’instant clé.', 'Passage express garanti en direct en moins de 3h', 35000.00, 'FCFA', '3h', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-6', 'cat-1', 'Dédicace VIP', 'dedicace-vip', 'Dédicace d’exception avec vœux personnalisés par deux célébrités invitées et remise d’un extrait vidéo HD.', 'Vœux royaux par nos célébrités en plateau + vidéo HD', 50000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', 1, 1),

-- Chants (6)
('srv-7', 'cat-2', 'Chant anniversaire court', 'chant-anniversaire-court', 'Interprétation a cappella rythmée et festive du refrain traditionnel avec mention chaleureuse du prénom.', 'Joyeux anniversaire dynamique en a cappella', 15000.00, 'FCFA', '12h', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-8', 'cat-2', 'Chant personnalisé prénom', 'chant-personnalise-prenom', 'Une chanson composée avec les anecdotes marquantes, les qualités et le prénom de la star du jour.', 'Morceau unique reprenant ses anecdotes et son prénom', 30000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-9', 'cat-2', 'Chant avec dédicace', 'chant-avec-dedicace', 'L’alliance parfaite entre une prestation vocale live et un mot doux personnalisé avant le refrain.', 'Sérénade vocale introduite par votre mot personnel', 35000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-10', 'cat-2', 'Chant live premium (Mariachi / Sax)', 'chant-live-premium', 'Sérénade inoubliable interprétée par un duo d’artistes professionnels au saxophone et au micro.', 'Prestation live envoûtante saxophone et voix', 50000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-11', 'cat-2', 'Chant groupe polyphonique', 'chant-groupe-polyphonique', 'Chœur acoustique de 4 chanteurs offrant une harmonie gospel festive et vibrante.', 'Harmonies polyphoniques festives à 4 voix', 60000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-12', 'cat-2', 'Chant surprise émotion', 'chant-surprise-emotion', 'Une ballade acoustique guitare/voix ultra-sensible conçue pour tirer des larmes de bonheur.', 'Ballade guitare-voix intimiste et bouleversante', 40000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80', 1, 0),

-- Cadeaux (6)
('srv-13', 'cat-3', 'Cadeau symbolique remis en public', 'cadeau-symbolique-remis-en-public', 'Remise solennelle d’un présent symbolique gravé avec son prénom et la date du jour.', 'Présent gravé et remis symboliquement à l’antenne', 20000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-14', 'cat-3', 'Bouquet surprise floral', 'bouquet-surprise-floral', 'Un magnifique bouquet de fleurs fraîches de saison livré avec ruban de satin brodé et carte dorée.', 'Élégant bouquet de fleurs fraîches avec carte dorée', 25000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-15', 'cat-3', 'Gâteau anniversaire pâtissier d’exception', 'gateau-anniversaire-patissier', 'Gâteau artisanal haute pâtisserie décoré aux couleurs festives avec bougies étincelantes et lettrage doré.', 'Gâteau gourmand haute pâtisserie décoré d’or', 45000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-16', 'cat-3', 'Coffret souvenir prestige', 'coffret-souvenir-prestige', 'Coffret luxueux réunissant chocolats fins, carte manuscrite de l’équipe et fiole de champagne.', 'Chocolats fins, mot d’or et souvenirs exclusifs', 40000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-17', 'cat-3', 'Cadeau personnalisé sur-mesure', 'cadeau-personnalise-sur-mesure', 'Création artisanale sur mesure selon les passions du destinataire (montre, bijou ou tableau).', 'Objet artisanal précieux adapté à ses passions', 55000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-18', 'cat-3', 'Cadeau premium Haute Célébration', 'cadeau-premium-haute-celebration', 'Panier d’abondance festif complet livré à domicile par notre hôtesse en tenue d’apparat.', 'Panier garni de prestige livré avec mise en scène', 75000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=800&q=80', 1, 0),

-- Appels surprise (6)
('srv-19', 'cat-4', 'Appel surprise simple', 'appel-surprise-simple', 'L’animateur compose le numéro du destinataire par surprise pour lui souhaiter un joyeux anniversaire.', 'Coup de fil chaleureux en direct pour le surprendre', 15000.00, 'FCFA', '12h', 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-20', 'cat-4', 'Appel pendant émission en direct', 'appel-pendant-emission-en-direct', 'Mise en ondes immédiate : le destinataire décroche sans savoir qu’il est écouté par des milliers d’auditeurs.', 'Direct surprise à l’antenne avec passage radio/TV', 25000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-21', 'cat-4', 'Appel avec message famille en duplex', 'appel-message-famille-duplex', 'Conférence surprise reliant le destinataire, vous et vos proches pour un moment de joie collective.', 'Duplex surprise réunissant toute la famille en ligne', 35000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-22', 'cat-4', 'Appel émotion et confidences', 'appel-emotion-confidences', 'Moment suspendu : l’animateur pose des questions douces et lit votre déclaration d’amour ou d’amitié.', 'Échange intime guidé avec lecture de votre lettre', 30000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-23', 'cat-4', 'Appel VIP avec invité d’honneur', 'appel-vip-invite-honneur', 'Un artiste renommé ou une personnalité de son choix prend la parole pour lui chanter son refrain préféré.', 'Appel magique avec son artiste ou idole préférée', 60000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-24', 'cat-4', 'Appel + dédicace audio souvenir', 'appel-dedicace-audio-souvenir', 'L’appel est entièrement mixé et masterisé avec une jaquette personnalisée téléchargeable à vie.', 'Appel surprise + enregistrement audio masterisé HD', 35000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=800&q=80', 1, 0),

-- Surprises complètes (6)
('srv-25', 'cat-5', 'Pack Dédicace + Chant', 'pack-dedicace-chant', 'Le duo incontournable : mot personnalisé à l’antenne suivi d’une sérénade vocale sur mesure.', 'Dédicace lue à l’antenne + chant personnalisé', 45000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-26', 'cat-5', 'Pack Appel + Chant', 'pack-appel-chant', 'L’animateur appelle en direct, suivi d’une improvisation musicale acoustique en direct au téléphone.', 'Appel surprise en direct + chant live exclusif', 50000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-27', 'cat-5', 'Pack Cadeau + Dédicace', 'pack-cadeau-dedicace', 'Livraison surprise du gâteau ou du bouquet pile au moment où la dédicace retentit sur les ondes.', 'Gâteau ou bouquet livré au son de sa dédicace', 60000.00, 'FCFA', '24h', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-28', 'cat-5', 'Pack Famille Célébration', 'pack-famille-celebration', 'Formule complète pour réunir enfants, parents et amis autour d’un appel duplex et d’un clip souvenir.', 'Duplex famille, chant collégial et clip souvenir', 80000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80', 1, 0),
('srv-29', 'cat-5', 'Pack Premium Émission Live', 'pack-premium-emission-live', 'Moment vedette de l’émission : 10 minutes dédiées avec duplex vidéo, chant live et cadeau physique.', '10 min de direct, chanson dédiée et remise de cadeau', 120000.00, 'FCFA', '48h', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80', 1, 1),
('srv-30', 'cat-5', 'Pack Inoubliable - Grand Luxe', 'pack-inoubliable-grand-luxe', 'L’expérience ultime : Mariachi ou orchestre à domicile, plateau télévisé, gâteau signature et film 4K.', 'Orchestre, émission dédiée, gâteau et vidéo 4K', 200000.00, 'FCFA', '72h', 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80', 1, 1);

-- 10 Realistic Orders with complete tracking & commissions
INSERT INTO orders (id, order_number, client_id, service_id, category_id, recipient_name, recipient_phone, birthday_date, message, special_instructions, status, amount, currency, commission_rate, commission_amount, net_amount, delivered_at) VALUES
('ord-101', 'CSA-2026-001', 'usr-client-1', 'srv-15', 'cat-3', 'Sophie Mensah', '+225 0707070701', '2026-08-25', 'Joyeux anniversaire maman adorée ! Que cette nouvelle année t’apporte santé, joie et prospérité.', 'Livrer à domicile à Cocody Angré avant 14h', 'paid', 45000.00, 'FCFA', 10.00, 4500.00, 40500.00, NULL),
('ord-102', 'CSA-2026-002', 'usr-client-2', 'srv-10', 'cat-2', 'Yasmine Yao', '+225 0707070702', '2026-08-22', 'Pour ma princesse, que ta journée soit illuminée de rires et de douce musique.', 'Jouer sa chanson préférée au saxophone', 'accepted', 50000.00, 'FCFA', 20.00, 10000.00, 40000.00, NULL),
('ord-103', 'CSA-2026-003', 'usr-client-3', 'srv-1', 'cat-1', 'Koffi Cissé', '+225 0707070703', '2026-08-21', 'Grand frère, merci pour tout ton soutien inconditionnel au fil des années.', 'Passer le message en début de l’émission de midi', 'in_progress', 10000.00, 'FCFA', 15.00, 1500.00, 8500.00, NULL),
('ord-104', 'CSA-2026-004', 'usr-client-4', 'srv-29', 'cat-5', 'Esther N’Goran', '+225 0707070704', '2026-08-18', '20 ans de mariage et ton anniversaire le même jour ! Je t’aime à l’infini.', 'Appel vidéo surprise et remise de bouquet', 'delivered', 120000.00, 'FCFA', 25.00, 30000.00, 90000.00, '2026-08-18 16:30:00'),
('ord-105', 'CSA-2026-005', 'usr-client-5', 'srv-19', 'cat-4', 'Ibrahim Diallo', '+225 0707070705', '2026-08-20', 'Joyeux anniversaire papa ! Fais nous ton plus beau sourire.', 'Appeler vers 11h pendant sa pause café', 'delivered', 15000.00, 'FCFA', 15.00, 2250.00, 12750.00, '2026-08-20 11:15:00'),
('ord-106', 'CSA-2026-006', 'usr-client-6', 'srv-8', 'cat-2', 'Nadège Koffi', '+225 0707070706', '2026-08-26', 'Une mélodie rien que pour toi mon amie précieuse.', 'Mentionner son surnom "Nana"', 'pending_payment', 30000.00, 'FCFA', 20.00, 6000.00, 24000.00, NULL),
('ord-107', 'CSA-2026-007', 'usr-client-7', 'srv-25', 'cat-5', 'Gérard Touré', '+225 0707070707', '2026-08-24', 'Félicitations pour tes 50 ans ! On t’aime très fort.', 'Surprise familiale en direct', 'paid', 45000.00, 'FCFA', 25.00, 11250.00, 33750.00, NULL),
('ord-108', 'CSA-2026-008', 'usr-client-8', 'srv-3', 'cat-1', 'Clarisse Diabaté', '+225 0707070708', '2026-08-23', 'Un rayon de soleil dans nos vies, joyeux anniversaire !', 'Afficher la photo envoyée en pièce jointe', 'accepted', 25000.00, 'FCFA', 15.00, 3750.00, 21250.00, NULL),
('ord-109', 'CSA-2026-009', 'usr-client-9', 'srv-14', 'cat-3', 'Sandrine Bamba', '+225 0707070709', '2026-08-19', 'Des fleurs aussi éclatantes que ta bonté de cœur.', 'Livrer à son bureau au Plateau', 'delivered', 25000.00, 'FCFA', 10.00, 2500.00, 22500.00, '2026-08-19 10:00:00'),
('ord-110', 'CSA-2026-010', 'usr-client-10', 'srv-20', 'cat-4', 'Boris Zadi', '+225 0707070710', '2026-08-15', 'Mon frangin d’une autre mère, fête bien ce quart de siècle !', 'Piéger gentiment au début de l’appel', 'cancelled', 25000.00, 'FCFA', 15.00, 3750.00, 21250.00, NULL);

-- Payments
INSERT INTO payments (id, order_id, user_id, provider, provider_reference, amount, currency, status, phone_number, paid_at) VALUES
('pay-101', 'ord-101', 'usr-client-1', 'mtn', 'MTN-CI-84920491', 45000.00, 'FCFA', 'success', '+225 0501020304', '2026-08-21 08:30:00'),
('pay-102', 'ord-102', 'usr-client-2', 'orange', 'OM-CI-77391028', 50000.00, 'FCFA', 'success', '+225 0502030405', '2026-08-21 09:12:00'),
('pay-103', 'ord-103', 'usr-client-3', 'mtn', 'MTN-CI-48201948', 10000.00, 'FCFA', 'success', '+225 0503040506', '2026-08-21 09:45:00'),
('pay-104', 'ord-104', 'usr-client-4', 'orange', 'OM-CI-99482012', 120000.00, 'FCFA', 'success', '+225 0504050607', '2026-08-17 14:20:00'),
('pay-105', 'ord-105', 'usr-client-5', 'mtn', 'MTN-CI-66291039', 15000.00, 'FCFA', 'success', '+225 0505060708', '2026-08-19 18:00:00'),
('pay-107', 'ord-107', 'usr-client-7', 'orange', 'OM-CI-11928374', 45000.00, 'FCFA', 'success', '+225 0507080910', '2026-08-21 10:05:00'),
('pay-108', 'ord-108', 'usr-client-8', 'mtn', 'MTN-CI-22837461', 25000.00, 'FCFA', 'success', '+225 0508091011', '2026-08-21 11:20:00'),
('pay-109', 'ord-109', 'usr-client-9', 'orange', 'OM-CI-33948572', 25000.00, 'FCFA', 'success', '+225 0509101112', '2026-08-18 16:45:00');

-- Order deliverables (video & audio records)
INSERT INTO order_deliverables (id, order_id, file_url, file_type, note, uploaded_by) VALUES
('del-1', 'ord-104', 'https://assets.mixkit.co/videos/preview/mixkit-friends-celebrating-a-birthday-with-confetti-4336-large.mp4', 'video', 'Extrait vidéo HD du direct et du chant d’anniversaire en plateau.', 'usr-staff-1'),
('del-2', 'ord-105', 'https://actions.google.com/sounds/v1/celebrations/party_horn.ogg', 'audio', 'Enregistrement audio masterisé du coup de fil surprise.', 'usr-staff-2'),
('del-3', 'ord-109', 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=800&q=80', 'image', 'Photo souvenir de la remise du bouquet surprise au bureau.', 'usr-staff-1');

-- Featured Videos (Moments Magiques matching Mockup Image 1)
INSERT INTO featured_videos (id, title, description, video_url, thumbnail_url, is_active, position, created_by) VALUES
('vid-1', 'Surprise Mariachi', 'Une sérénade inoubliable à domicile qui a ému toute la famille aux larmes.', 'https://assets.mixkit.co/videos/preview/mixkit-friends-celebrating-a-birthday-with-confetti-4336-large.mp4', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80', 1, 1, 'usr-staff-1'),
('vid-2', 'Message Gourmand', 'Dédicace personnalisée au dessert en direct d’un restaurant étoilé.', 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-small-birthday-cake-with-a-burning-candle-4340-large.mp4', 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80', 1, 2, 'usr-staff-1'),
('vid-3', 'L’Appel Coup de Cœur', 'Quand maman décroche en direct de la radio nationale sans s’y attendre.', 'https://assets.mixkit.co/videos/preview/mixkit-a-girl-blowing-out-candles-on-a-birthday-cake-4338-large.mp4', 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?auto=format&fit=crop&w=800&q=80', 1, 3, 'usr-staff-2');

-- Reviews
INSERT INTO reviews (id, order_id, service_id, user_id, rating, comment, status) VALUES
('rev-1', 'ord-104', 'srv-29', 'usr-client-4', 5, 'Une expérience au-delà de mes espérances. Mon épouse a pleuré de joie pendant tout le direct ! Merci infiniment à l’équipe.', 'published'),
('rev-2', 'ord-105', 'srv-19', 'usr-client-5', 5, 'L’appel était si bienveillant et festif ! Mon père n’en revenait pas. Le fichier souvenir est gravé dans nos mémoires.', 'published'),
('rev-3', 'ord-109', 'srv-14', 'usr-client-9', 5, 'Bouquet magnifique et livraison avec le sourire pile à l’heure demandée.', 'published'),
('rev-4', 'ord-102', 'srv-10', 'usr-client-2', 5, 'Le solo de saxophone était magique. Un vrai moment de théâtre et de poésie.', 'published');

-- Favorites
INSERT INTO favorites (id, user_id, service_id) VALUES
('fav-1', 'usr-client-1', 'srv-15'),
('fav-2', 'usr-client-1', 'srv-10'),
('fav-3', 'usr-client-1', 'srv-29');

-- Notifications
INSERT INTO notifications (id, user_id, title, message, type, is_read) VALUES
('notif-1', 'usr-client-1', 'Commande confirmée !', 'Votre commande #CSA-2026-001 pour le Gâteau Surprise est validée.', 'order', 0),
('notif-2', 'usr-client-2', 'Commande acceptée', 'L’équipe de régie a pris en charge votre sérénade saxophone.', 'order', 0),
('notif-3', 'usr-client-4', 'Livrable disponible', 'La vidéo souvenir de votre surprise en direct est prête au téléchargement.', 'delivery', 1);
