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
    ('elektronik', 'Headset Bluetooth Bass Jernih', 'Headset nirkabel dengan suara jernih, baterai tahan lama, dan nyaman dipakai untuk kerja maupun hiburan.', 129000, 42, 'https://loremflickr.com/800/600/bluetooth-headphones?lock=101'),
    ('komputer-laptop', 'Keyboard Mechanical RGB', 'Keyboard mechanical dengan switch responsif, lampu RGB, dan bodi kokoh untuk mengetik dan bermain game.', 349000, 35, 'https://loremflickr.com/800/600/mechanical-keyboard?lock=102'),
    ('komputer-laptop', 'Mouse Wireless Silent Click', 'Mouse wireless ergonomis dengan klik senyap, sensor stabil, dan baterai hemat untuk aktivitas harian.', 89000, 76, 'https://loremflickr.com/800/600/wireless-mouse?lock=103'),
    ('elektronik', 'Power Bank 20000mAh Fast Charge', 'Power bank kapasitas besar dengan fitur fast charging dan perlindungan arus untuk perjalanan panjang.', 219000, 51, 'https://loremflickr.com/800/600/power-bank?lock=104'),
    ('elektronik', 'Charger Fast Charging 33W', 'Adaptor charger ringkas dengan pengisian cepat untuk ponsel dan perangkat USB modern.', 79000, 88, 'https://loremflickr.com/800/600/phone-charger?lock=105'),
    ('aksesoris', 'Kabel USB Type-C Nylon 1 Meter', 'Kabel data Type-C berlapis nylon yang kuat, fleksibel, dan mendukung pengisian cepat.', 35000, 120, 'https://loremflickr.com/800/600/usb-c-cable?lock=106'),
    ('fashion-pria', 'Sepatu Sneakers Pria Casual', 'Sneakers pria ringan dengan desain casual, cocok untuk jalan santai, kampus, dan kerja.', 249000, 63, 'https://loremflickr.com/800/600/mens-sneakers?lock=107'),
    ('fashion-pria', 'Kaos Polos Oversize Cotton', 'Kaos oversize berbahan cotton combed yang adem, lembut, dan mudah dipadukan.', 69000, 140, 'https://loremflickr.com/800/600/oversized-tshirt?lock=108'),
    ('fashion-pria', 'Hoodie Pria Fleece Premium', 'Hoodie hangat berbahan fleece premium dengan jahitan rapi dan kantong depan.', 159000, 58, 'https://loremflickr.com/800/600/mens-hoodie?lock=109'),
    ('fashion-wanita', 'Tas Selempang Wanita Minimalis', 'Tas selempang wanita dengan desain simpel, ruang cukup luas, dan tali yang nyaman.', 119000, 67, 'https://loremflickr.com/800/600/womens-crossbody-bag?lock=110'),
    ('kesehatan', 'Skincare Serum Niacinamide', 'Serum wajah ringan untuk membantu merawat kulit agar tampak lebih cerah dan lembap.', 85000, 94, 'https://loremflickr.com/800/600/skincare-serum?lock=111'),
    ('peralatan-rumah', 'Botol Minum Stainless 750ml', 'Botol minum stainless tahan panas dan dingin, cocok dibawa ke kantor, sekolah, atau olahraga.', 99000, 73, 'https://loremflickr.com/800/600/stainless-water-bottle?lock=112'),
    ('peralatan-rumah', 'Rak Dapur Minimalis 3 Susun', 'Rak dapur serbaguna dengan desain minimalis untuk menyimpan bumbu, piring, dan perlengkapan masak.', 179000, 39, 'https://loremflickr.com/800/600/kitchen-rack?lock=113'),
    ('elektronik', 'Lampu Meja LED Adjustable', 'Lampu meja LED hemat energi dengan tingkat kecerahan yang dapat diatur untuk belajar dan bekerja.', 109000, 82, 'https://loremflickr.com/800/600/desk-lamp?lock=114'),
    ('makanan-minuman', 'Kopi Arabika 250g Giling', 'Kopi arabika pilihan dengan aroma khas, cocok untuk seduh manual maupun mesin kopi.', 75000, 110, 'https://loremflickr.com/800/600/arabica-coffee?lock=115'),
    ('makanan-minuman', 'Teh Hijau Premium 100g', 'Teh hijau premium dengan rasa lembut dan aroma segar untuk menemani waktu santai.', 49000, 96, 'https://loremflickr.com/800/600/green-tea?lock=116'),
    ('peralatan-rumah', 'Set Sprei Katun Motif Modern', 'Sprei katun lembut dengan motif modern, nyaman digunakan untuk tidur berkualitas.', 149000, 44, 'https://loremflickr.com/800/600/bedsheet?lock=117'),
    ('fashion-wanita', 'Blouse Wanita Casual', 'Blouse wanita berbahan ringan dengan potongan rapi untuk aktivitas kantor dan santai.', 99000, 61, 'https://loremflickr.com/800/600/womens-blouse?lock=118'),
    ('fashion-wanita', 'Sandal Wanita Flat Elegan', 'Sandal flat nyaman dengan desain elegan untuk pemakaian harian.', 89000, 70, 'https://loremflickr.com/800/600/womens-sandals?lock=119'),
    ('aksesoris', 'Jam Tangan Digital Sport', 'Jam tangan digital tahan percikan air dengan fitur alarm, stopwatch, dan tampilan sporty.', 135000, 54, 'https://loremflickr.com/800/600/digital-watch?lock=120'),
    ('aksesoris', 'Dompet Kulit Pria Slim', 'Dompet pria model slim dengan bahan kulit sintetis berkualitas dan banyak slot kartu.', 79000, 86, 'https://loremflickr.com/800/600/mens-wallet?lock=121'),
    ('komputer-laptop', 'Stand Laptop Aluminium', 'Stand laptop aluminium yang kokoh untuk posisi kerja lebih ergonomis dan meja lebih rapi.', 139000, 45, 'https://loremflickr.com/800/600/laptop-stand?lock=122'),
    ('komputer-laptop', 'Webcam Full HD 1080p', 'Webcam Full HD dengan mikrofon bawaan untuk meeting online dan kelas virtual.', 259000, 37, 'https://loremflickr.com/800/600/webcam?lock=123'),
    ('elektronik', 'Smartwatch Fitness Tracker', 'Smartwatch dengan pemantauan aktivitas, notifikasi, dan baterai tahan lama.', 299000, 48, 'https://loremflickr.com/800/600/smartwatch?lock=124'),
    ('kesehatan', 'Masker Medis 3 Ply Isi 50', 'Masker medis 3 lapis untuk perlindungan harian dengan bahan lembut dan nyaman.', 39000, 160, 'https://loremflickr.com/800/600/medical-mask?lock=125'),
    ('kesehatan', 'Vitamin C 1000mg Isi 30', 'Suplemen vitamin C untuk membantu menjaga daya tahan tubuh sehari-hari.', 69000, 105, 'https://loremflickr.com/800/600/vitamin-c?lock=126'),
    ('peralatan-rumah', 'Vacuum Cleaner Portable', 'Vacuum cleaner portable untuk membersihkan sofa, meja, mobil, dan area kecil dengan mudah.', 249000, 32, 'https://loremflickr.com/800/600/portable-vacuum?lock=127'),
    ('makanan-minuman', 'Keripik Singkong Balado', 'Keripik singkong renyah dengan bumbu balado pedas manis khas Indonesia.', 28000, 130, 'https://loremflickr.com/800/600/cassava-chips?lock=128')
) AS p(category_slug, name, description, price, stock, image_url)
JOIN categories c ON c.slug = p.category_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM products existing
  WHERE existing.name = p.name
);
