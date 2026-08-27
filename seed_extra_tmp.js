const mysql = require('mysql2/promise');
require('dotenv').config();

const enc = (p) => encodeURI(p);

const newServices = [
  // Dédicace (cat-1)
  ['srv-dedicace-2', 'cat-1', 'Dédicace avec photo affichée', 'dedicace-photo-affichee',
   'Votre dédicace lue en direct pendant que la plus belle photo du jubilaire est diffusée à l’écran.',
   'Message lu avec affichage photo à l’écran', 8000, '24h', '/catalogue/dedicace/' + encodeURIComponent('dédicace1.jpg')],
  ['srv-dedicace-3', 'cat-1', 'Dédicace spéciale famille', 'dedicace-speciale-famille',
   'Un hommage collectif réunissant les messages de tous les membres de la famille, avec habillage sonore spécial.',
   'Hommage chaleureux réunissant toute la famille', 15000, '48h', '/catalogue/dedicace/' + encodeURIComponent('dédicace2.avif')],
  ['srv-dedicace-4', 'cat-1', 'Dédicace express minute', 'dedicace-express-minute',
   'Programmation prioritaire pour un passage garanti en moins de 3 heures, idéal pour ne rater aucun instant clé.',
   'Passage express garanti en moins de 3h', 20000, '3h', '/catalogue/dedicace/' + encodeURIComponent('dédicace4.avif')],

  // Chant (cat-2)
  ['srv-chant-2', 'cat-2', 'Sérénade acoustique live', 'serenade-acoustique-live',
   'Un chant interprété en direct à la guitare acoustique, pour une ambiance intime et émouvante.',
   'Sérénade live à la guitare acoustique', 15000, '24h', '/catalogue/chants/chant1.jpg'],
  ['srv-chant-3', 'cat-2', 'Chant duo surprise', 'chant-duo-surprise',
   'Une interprétation à deux voix pour une surprise encore plus spectaculaire et mémorable.',
   'Interprétation à deux voix', 18000, '48h', '/catalogue/chants/chant3.avif'],
  ['srv-chant-4', 'cat-2', 'Chant avec vidéo souvenir', 'chant-video-souvenir',
   'Votre chant personnalisé, filmé en haute définition et remis en souvenir pour revivre l’émotion à volonté.',
   'Chant personnalisé filmé en HD', 22000, '48h', '/catalogue/chants/chant4.avif'],

  // Cadeau (cat-3)
  ['srv-cadeau-2', 'cat-3', 'Coffret prestige homme', 'coffret-prestige-homme',
   'Un coffret élégant réunissant montre, portefeuille et ceinture, livré en mains propres pour l’occasion.',
   'Coffret montre, portefeuille et ceinture', 25000, '48h', '/catalogue/cadeaux/cadeaux2.jpg'],
  ['srv-cadeau-3', 'cat-3', 'Stylo gravé personnalisé', 'stylo-grave-personnalise',
   'Un stylo en bois gravé au prénom du jubilaire, un souvenir délicat et durable de la surprise.',
   'Stylo en bois gravé au prénom', 6000, '24h', '/catalogue/cadeaux/cadeaux3.jpg'],
  ['srv-cadeau-4', 'cat-3', 'Bouquet et mot doux', 'bouquet-et-mot-doux',
   'Un bouquet de fleurs fraîches accompagné d’une carte manuscrite pour un twist attendrissant.',
   'Bouquet de fleurs avec carte manuscrite', 12000, '24h', '/catalogue/cadeaux/cadeaux4.avif'],

  // Appel surprise (cat-4)
  ['srv-appel-2', 'cat-4', 'Appel vidéo complice', 'appel-video-complice',
   'Un appel vidéo surprise avec l’animateur pour transmettre le message directement, visage découvert.',
   'Appel vidéo surprise avec l’animateur', 7000, '24h', '/catalogue/appels/appel2.jpg'],
  ['srv-appel-3', 'cat-4', 'Appel surprise VIP', 'appel-surprise-vip',
   'Passage prioritaire avec message audio personnalisé remis en souvenir après l’appel.',
   'Passage prioritaire avec message audio remis', 12000, '12h', '/catalogue/appels/appel3.jpg'],
  ['srv-appel-4', 'cat-4', 'Appel groupe famille', 'appel-groupe-famille',
   'Un appel collectif surprise réunissant plusieurs proches en même temps pour souhaiter l’anniversaire.',
   'Appel collectif réunissant plusieurs proches', 15000, '48h', '/catalogue/appels/appel4.jpg'],

  // Surprise complète (cat-5)
  ['srv-complete-2', 'cat-5', 'Pack Émotion Totale', 'pack-emotion-totale',
   'La combinaison dédicace, chant et cadeau pour une expérience d’anniversaire riche en émotions.',
   'Dédicace + chant + cadeau', 25000, '48h', enc('/catalogue/suprise complet/supprise2.jpg')],
  ['srv-complete-3', 'cat-5', 'Pack VIP Antenne', 'pack-vip-antenne',
   'Diffusion radio/TV prioritaire, gâteau festif et appel surprise réunis dans une formule VIP.',
   'Diffusion antenne + gâteau + appel', 35000, '72h', enc('/catalogue/suprise complet/supprise3.jpg')],
  ['srv-complete-4', 'cat-5', 'Pack Prestige Famille', 'pack-prestige-famille',
   'Notre expérience la plus complète, pensée pour réunir toute la famille autour d’une surprise inoubliable.',
   'Expérience complète pour toute la famille', 45000, '72h', enc('/catalogue/suprise complet/supprise4.jpg')],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const [id, categoryId, name, slug, description, shortDescription, price, delayLabel, imageUrl] of newServices) {
    await conn.execute(
      `INSERT INTO services (id, category_id, name, slug, description, short_description, price, currency, delay_label, image_url, is_available, is_featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'FCFA', ?, ?, 1, 0)
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
      [id, categoryId, name, slug, description, shortDescription, price, delayLabel, imageUrl]
    );
    console.log('inserted', id);
  }

  const [[{ cnt }]] = await conn.query('SELECT COUNT(*) as cnt FROM services');
  console.log('total services now:', cnt);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
