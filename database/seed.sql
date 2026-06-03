INSERT INTO categories (name, slug, description)
VALUES
  ('Elektronik', 'elektronik', 'Gadget dan perangkat elektronik untuk kebutuhan harian.'),
  ('Fashion Pria', 'fashion-pria', 'Pakaian, sepatu, dan aksesoris pria.'),
  ('Fashion Wanita', 'fashion-wanita', 'Produk fashion wanita untuk berbagai gaya.'),
  ('Peralatan Rumah', 'peralatan-rumah', 'Perlengkapan rumah tangga praktis dan modern.'),
  ('Kesehatan', 'kesehatan', 'Produk perawatan tubuh, kesehatan, dan kebersihan.'),
  ('Aksesoris', 'aksesoris', 'Aksesoris pilihan untuk menunjang aktivitas.'),
  ('Komputer & Laptop', 'komputer-laptop', 'Perangkat komputer, laptop, dan perlengkapannya.'),
  ('Makanan & Minuman', 'makanan-minuman', 'Makanan ringan, kopi, teh, dan minuman favorit.')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO products (category_id, name, description, price, stock, image_url)
SELECT c.id, p.name, p.description, p.price, p.stock, p.image_url
FROM (
  VALUES
    ('elektronik', 'Headset Bluetooth Bass Jernih', 'Headset nirkabel dengan suara jernih, baterai tahan lama, dan nyaman dipakai untuk kerja maupun hiburan.', 129000, 42, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60'),
    ('komputer-laptop', 'Keyboard Mechanical RGB', 'Keyboard mechanical dengan switch responsif, lampu RGB, dan bodi kokoh untuk mengetik dan bermain game.', 349000, 35, 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=60'),
    ('komputer-laptop', 'Mouse Wireless Silent Click', 'Mouse wireless ergonomis dengan klik senyap, sensor stabil, dan baterai hemat untuk aktivitas harian.', 89000, 76, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60'),
    ('elektronik', 'Power Bank 20000mAh Fast Charge', 'Power bank kapasitas besar dengan fitur fast charging and perlindungan arus untuk perjalanan panjang.', 219000, 51, 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=60'),
    ('elektronik', 'Charger Fast Charging 33W', 'Adaptor charger ringkas dengan pengisian cepat untuk ponsel dan perangkat USB modern.', 79000, 88, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=60'),
    ('aksesoris', 'Kabel USB Type-C Nylon 1 Meter', 'Kabel data Type-C berlapis nylon yang kuat, fleksibel, dan mendukung pengisian cepat.', 35000, 120, 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop&q=60'),
    ('fashion-pria', 'Sepatu Sneakers Pria Casual', 'Sneakers pria ringan dengan desain casual, cocok untuk jalan santai, kampus, dan kerja.', 249000, 63, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=60'),
    ('fashion-pria', 'Kaos Polos Oversize Cotton', 'Kaos oversize berbahan cotton combed yang adem, lembut, dan mudah dipadukan.', 69000, 140, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=60'),
    ('fashion-pria', 'Hoodie Pria Fleece Premium', 'Hoodie hangat berbahan fleece premium dengan jahitan rapi dan kantong depan.', 159000, 58, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=60'),
    ('fashion-wanita', 'Tas Selempang Wanita Minimalis', 'Tas selempang wanita dengan desain simpel, ruang cukup luas, dan tali yang nyaman.', 119000, 67, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=60'),
    ('kesehatan', 'Skincare Serum Niacinamide', 'Serum wajah ringan untuk membantu merawat kulit agar tampak lebih cerah dan lembap.', 85000, 94, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=60'),
    ('peralatan-rumah', 'Botol Minum Stainless 750ml', 'Botol minum stainless tahan panas dan dingin, cocok dibawa ke kantor, sekolah, atau olahraga.', 99000, 73, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60'),
    ('peralatan-rumah', 'Rak Dapur Minimalis 3 Susun', 'Rak dapur serbaguna dengan desain minimalis untuk menyimpan bumbu, piring, dan perlengkapan masak.', 179000, 39, 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&auto=format&fit=crop&q=60'),
    ('elektronik', 'Lampu Meja LED Adjustable', 'Lampu meja LED hemat energi dengan tingkat kecerahan yang dapat diatur untuk belajar dan bekerja.', 109000, 82, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=60'),
    ('makanan-minuman', 'Kopi Arabika 250g Giling', 'Kopi arabika pilihan dengan aroma khas, cocok untuk seduh manual maupun mesin kopi.', 75000, 110, 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=60'),
    ('makanan-minuman', 'Teh Hijau Premium 100g', 'Teh hijau premium dengan rasa lembut dan aroma segar untuk menemani waktu santai.', 49000, 96, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=60'),
    ('peralatan-rumah', 'Set Sprei Katun Motif Modern', 'Sprei katun lembut dengan motif modern, nyaman digunakan untuk tidur berkualitas.', 149000, 44, 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=60'),
    ('fashion-wanita', 'Blouse Wanita Casual', 'Blouse wanita berbahan ringan dengan potongan rapi untuk aktivitas kantor dan santai.', 99000, 61, 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=60'),
    ('fashion-wanita', 'Sandal Wanita Flat Elegan', 'Sandal flat nyaman dengan desain elegan untuk pemakaian harian.', 89000, 70, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=60'),
    ('aksesoris', 'Jam Tangan Digital Sport', 'Jam tangan digital tahan percikan air dengan fitur alarm, stopwatch, dan tampilan sporty.', 135000, 54, 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop&q=60'),
    ('aksesoris', 'Dompet Kulit Pria Slim', 'Dompet pria model slim dengan bahan kulit sintetis berkualitas and banyak slot kartu.', 79000, 86, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=60'),
    ('komputer-laptop', 'Stand Laptop Aluminium', 'Stand laptop aluminium yang kokoh untuk posisi kerja lebih ergonomis dan meja lebih rapi.', 139000, 45, 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=800&auto=format&fit=crop&q=60'),
    ('komputer-laptop', 'Webcam Full HD 1080p', 'Webcam Full HD dengan mikrofon bawaan untuk meeting online dan kelas virtual.', 259000, 37, 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=60'),
    ('elektronik', 'Smartwatch Fitness Tracker', 'Smartwatch dengan pemantauan aktivitas, notifikasi, dan baterai tahan lama.', 299000, 48, 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=60'),
    ('kesehatan', 'Masker Medis 3 Ply Isi 50', 'Masker medis 3 lapis untuk perlindungan harian dengan bahan lembut dan nyaman.', 39000, 160, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=60'),
    ('kesehatan', 'Vitamin C 1000mg Isi 30', 'Suplemen vitamin C untuk membantu menjaga daya tahan tubuh sehari-hari.', 69000, 105, 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=60'),
    ('peralatan-rumah', 'Vacuum Cleaner Portable', 'Vacuum cleaner portable untuk membersihkan sofa, meja, mobil, dan area kecil dengan mudah.', 249000, 32, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=60'),
    ('makanan-minuman', 'Keripik Singkong Balado', 'Keripik singkong renyah dengan bumbu balado pedas manis khas Indonesia.', 28000, 130, 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=60')
) AS p(category_slug, name, description, price, stock, image_url)
JOIN categories c ON c.slug = p.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM products existing
  WHERE existing.name = p.name
);
