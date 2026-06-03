import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { query, transaction } from './db.js';

const schemaSql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  phone VARCHAR(32) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'admin')) DEFAULT 'customer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(120) NOT NULL,
  recipient_phone VARCHAR(32) NOT NULL,
  province VARCHAR(80) NOT NULL,
  city VARCHAR(80) NOT NULL,
  district VARCHAR(80) NOT NULL,
  postal_code VARCHAR(16) NOT NULL,
  full_address TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  address_id INTEGER NOT NULL REFERENCES addresses(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled')) DEFAULT 'pending',
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(180) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
`;

const categories = [
  ['Elektronik', 'elektronik', 'Gadget dan perangkat elektronik untuk kebutuhan harian.'],
  ['Fashion Pria', 'fashion-pria', 'Pakaian, sepatu, dan aksesoris pria.'],
  ['Fashion Wanita', 'fashion-wanita', 'Produk fashion wanita untuk berbagai gaya.'],
  ['Peralatan Rumah', 'peralatan-rumah', 'Perlengkapan rumah tangga praktis dan modern.'],
  ['Kesehatan', 'kesehatan', 'Produk perawatan tubuh, kesehatan, dan kebersihan.'],
  ['Aksesoris', 'aksesoris', 'Aksesoris pilihan untuk menunjang aktivitas.'],
  ['Komputer & Laptop', 'komputer-laptop', 'Perangkat komputer, laptop, dan perlengkapannya.'],
  ['Makanan & Minuman', 'makanan-minuman', 'Makanan ringan, kopi, teh, dan minuman favorit.']
];

const products = [
  ['elektronik', 'Headset Bluetooth Bass Jernih', 'Headset nirkabel dengan suara jernih, baterai tahan lama, dan nyaman dipakai untuk kerja maupun hiburan.', 129000, 42, 'bluetooth-headphones'],
  ['komputer-laptop', 'Keyboard Mechanical RGB', 'Keyboard mechanical dengan switch responsif, lampu RGB, dan bodi kokoh untuk mengetik dan bermain game.', 349000, 35, 'mechanical-keyboard'],
  ['komputer-laptop', 'Mouse Wireless Silent Click', 'Mouse wireless ergonomis dengan klik senyap, sensor stabil, dan baterai hemat untuk aktivitas harian.', 89000, 76, 'wireless-mouse'],
  ['elektronik', 'Power Bank 20000mAh Fast Charge', 'Power bank kapasitas besar dengan fitur fast charging dan perlindungan arus untuk perjalanan panjang.', 219000, 51, 'power-bank'],
  ['elektronik', 'Charger Fast Charging 33W', 'Adaptor charger ringkas dengan pengisian cepat untuk ponsel dan perangkat USB modern.', 79000, 88, 'phone-charger'],
  ['aksesoris', 'Kabel USB Type-C Nylon 1 Meter', 'Kabel data Type-C berlapis nylon yang kuat, fleksibel, dan mendukung pengisian cepat.', 35000, 120, 'usb-c-cable'],
  ['fashion-pria', 'Sepatu Sneakers Pria Casual', 'Sneakers pria ringan dengan desain casual, cocok untuk jalan santai, kampus, dan kerja.', 249000, 63, 'mens-sneakers'],
  ['fashion-pria', 'Kaos Polos Oversize Cotton', 'Kaos oversize berbahan cotton combed yang adem, lembut, dan mudah dipadukan.', 69000, 140, 'oversized-tshirt'],
  ['fashion-pria', 'Hoodie Pria Fleece Premium', 'Hoodie hangat berbahan fleece premium dengan jahitan rapi dan kantong depan.', 159000, 58, 'mens-hoodie'],
  ['fashion-wanita', 'Tas Selempang Wanita Minimalis', 'Tas selempang wanita dengan desain simpel, ruang cukup luas, dan tali yang nyaman.', 119000, 67, 'womens-crossbody-bag'],
  ['kesehatan', 'Skincare Serum Niacinamide', 'Serum wajah ringan untuk membantu merawat kulit agar tampak lebih cerah dan lembap.', 85000, 94, 'skincare-serum'],
  ['peralatan-rumah', 'Botol Minum Stainless 750ml', 'Botol minum stainless tahan panas dan dingin, cocok dibawa ke kantor, sekolah, atau olahraga.', 99000, 73, 'stainless-water-bottle'],
  ['peralatan-rumah', 'Rak Dapur Minimalis 3 Susun', 'Rak dapur serbaguna dengan desain minimalis untuk menyimpan bumbu, piring, dan perlengkapan masak.', 179000, 39, 'kitchen-rack'],
  ['elektronik', 'Lampu Meja LED Adjustable', 'Lampu meja LED hemat energi dengan tingkat kecerahan yang dapat diatur untuk belajar dan bekerja.', 109000, 82, 'desk-lamp'],
  ['makanan-minuman', 'Kopi Arabika 250g Giling', 'Kopi arabika pilihan dengan aroma khas, cocok untuk seduh manual maupun mesin kopi.', 75000, 110, 'arabica-coffee'],
  ['makanan-minuman', 'Teh Hijau Premium 100g', 'Teh hijau premium dengan rasa lembut dan aroma segar untuk menemani waktu santai.', 49000, 96, 'green-tea'],
  ['peralatan-rumah', 'Set Sprei Katun Motif Modern', 'Sprei katun lembut dengan motif modern, nyaman digunakan untuk tidur berkualitas.', 149000, 44, 'bedsheet'],
  ['fashion-wanita', 'Blouse Wanita Casual', 'Blouse wanita berbahan ringan dengan potongan rapi untuk aktivitas kantor dan santai.', 99000, 61, 'womens-blouse'],
  ['fashion-wanita', 'Sandal Wanita Flat Elegan', 'Sandal flat nyaman dengan desain elegan untuk pemakaian harian.', 89000, 70, 'womens-sandals'],
  ['aksesoris', 'Jam Tangan Digital Sport', 'Jam tangan digital tahan percikan air dengan fitur alarm, stopwatch, dan tampilan sporty.', 135000, 54, 'digital-watch'],
  ['aksesoris', 'Dompet Kulit Pria Slim', 'Dompet pria model slim dengan bahan kulit sintetis berkualitas dan banyak slot kartu.', 79000, 86, 'mens-wallet'],
  ['komputer-laptop', 'Stand Laptop Aluminium', 'Stand laptop aluminium yang kokoh untuk posisi kerja lebih ergonomis dan meja lebih rapi.', 139000, 45, 'laptop-stand'],
  ['komputer-laptop', 'Webcam Full HD 1080p', 'Webcam Full HD dengan mikrofon bawaan untuk meeting online dan kelas virtual.', 259000, 37, 'webcam'],
  ['elektronik', 'Smartwatch Fitness Tracker', 'Smartwatch dengan pemantauan aktivitas, notifikasi, dan baterai tahan lama.', 299000, 48, 'smartwatch'],
  ['kesehatan', 'Masker Medis 3 Ply Isi 50', 'Masker medis 3 lapis untuk perlindungan harian dengan bahan lembut dan nyaman.', 39000, 160, 'medical-mask'],
  ['kesehatan', 'Vitamin C 1000mg Isi 30', 'Suplemen vitamin C untuk membantu menjaga daya tahan tubuh sehari-hari.', 69000, 105, 'vitamin-c'],
  ['peralatan-rumah', 'Vacuum Cleaner Portable', 'Vacuum cleaner portable untuk membersihkan sofa, meja, mobil, dan area kecil dengan mudah.', 249000, 32, 'portable-vacuum'],
  ['peralatan-rumah', 'Wajan Anti Lengket 24cm', 'Wajan anti lengket dengan gagang nyaman dan panas merata untuk memasak sehari-hari.', 115000, 79, 'nonstick-pan'],
  ['makanan-minuman', 'Cokelat Almond 200g', 'Cokelat dengan campuran almond renyah, cocok untuk camilan atau hadiah.', 58000, 91, 'almond-chocolate'],
  ['makanan-minuman', 'Keripik Singkong Balado', 'Keripik singkong renyah dengan bumbu balado pedas manis khas Indonesia.', 28000, 130, 'cassava-chips'],
  ['fashion-pria', 'Kemeja Pria Oxford', 'Kemeja oxford pria dengan bahan adem dan tampilan rapi untuk kerja maupun acara santai.', 129000, 57, 'mens-shirt'],
  ['fashion-pria', 'Celana Chino Slim Fit', 'Celana chino slim fit dengan bahan nyaman dan warna mudah dipadukan.', 159000, 62, 'mens-chino'],
  ['fashion-wanita', 'Rok Plisket Wanita', 'Rok plisket wanita dengan bahan jatuh, ringan, dan cocok untuk gaya kasual.', 99000, 75, 'pleated-skirt'],
  ['fashion-wanita', 'Outer Rajut Wanita', 'Outer rajut lembut dengan model simpel untuk tampilan nyaman dan stylish.', 139000, 46, 'womens-cardigan'],
  ['aksesoris', 'Kacamata Anti Radiasi', 'Kacamata anti radiasi ringan untuk membantu kenyamanan saat menatap layar.', 69000, 100, 'computer-glasses'],
  ['aksesoris', 'Topi Baseball Unisex', 'Topi baseball unisex dengan bahan ringan, nyaman, dan mudah disesuaikan.', 59000, 112, 'baseball-cap'],
  ['komputer-laptop', 'Flashdisk USB 64GB', 'Flashdisk 64GB dengan desain ringkas untuk menyimpan dan memindahkan data.', 65000, 134, 'usb-flash-drive'],
  ['komputer-laptop', 'SSD External 512GB', 'SSD external cepat dan portabel untuk backup foto, video, dan dokumen penting.', 699000, 26, 'external-ssd'],
  ['elektronik', 'Speaker Bluetooth Portable', 'Speaker bluetooth portable dengan suara lantang dan desain ringkas untuk dibawa bepergian.', 189000, 59, 'bluetooth-speaker'],
  ['elektronik', 'Tripod Kamera dan HP', 'Tripod fleksibel untuk ponsel dan kamera, cocok untuk konten, meeting, dan foto produk.', 99000, 84, 'phone-tripod'],
  ['peralatan-rumah', 'Kotak Penyimpanan Serbaguna', 'Kotak penyimpanan praktis untuk merapikan pakaian, mainan, dan perlengkapan rumah.', 69000, 98, 'storage-box'],
  ['peralatan-rumah', 'Keset Kamar Mandi Microfiber', 'Keset microfiber lembut, cepat menyerap air, dan mudah dicuci.', 45000, 122, 'bath-mat'],
  ['kesehatan', 'Timbangan Badan Digital', 'Timbangan badan digital dengan layar jelas dan pengukuran stabil.', 119000, 64, 'digital-scale'],
  ['kesehatan', 'Minyak Kayu Putih 120ml', 'Minyak kayu putih aroma hangat untuk membantu kenyamanan tubuh sehari-hari.', 36000, 150, 'eucalyptus-oil'],
  ['makanan-minuman', 'Granola Honey Almond 300g', 'Granola renyah dengan madu dan almond untuk sarapan praktis dan lezat.', 65000, 83, 'granola'],
  ['makanan-minuman', 'Sambal Bawang Botol 200g', 'Sambal bawang pedas gurih dalam botol, cocok untuk lauk harian.', 34000, 125, 'chili-sauce'],
  ['fashion-pria', 'Jaket Bomber Pria', 'Jaket bomber pria dengan bahan nyaman dan desain kasual untuk aktivitas luar ruangan.', 199000, 41, 'bomber-jacket'],
  ['fashion-wanita', 'Hijab Voal Premium', 'Hijab voal premium ringan, mudah dibentuk, dan nyaman dipakai seharian.', 59000, 118, 'hijab'],
  ['aksesoris', 'Gelang Stainless Minimalis', 'Gelang stainless dengan desain minimalis untuk pelengkap gaya harian.', 49000, 90, 'bracelet'],
  ['komputer-laptop', 'Cooling Pad Laptop 2 Fan', 'Cooling pad laptop dengan dua kipas, membantu menjaga suhu laptop saat digunakan lama.', 159000, 52, 'laptop-cooling-pad'],
  ['elektronik', 'Earphone Type-C Original', 'Earphone Type-C dengan suara jernih, mikrofon bawaan, dan kabel kuat untuk pemakaian harian.', 69000, 101, 'usb-c-earphones'],
  ['peralatan-rumah', 'Dispenser Sabun Otomatis', 'Dispenser sabun otomatis dengan sensor responsif untuk dapur dan kamar mandi.', 129000, 49, 'soap-dispenser']
];

const unsplashImages = {
  'bluetooth-headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=60',
  'mechanical-keyboard': 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=60',
  'wireless-mouse': 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800&auto=format&fit=crop&q=60',
  'power-bank': 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=800&auto=format&fit=crop&q=60',
  'phone-charger': 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=60',
  'usb-c-cable': 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&auto=format&fit=crop&q=60',
  'mens-sneakers': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&auto=format&fit=crop&q=60',
  'oversized-tshirt': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=60',
  'mens-hoodie': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&auto=format&fit=crop&q=60',
  'womens-crossbody-bag': 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=60',
  'skincare-serum': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=60',
  'stainless-water-bottle': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=60',
  'kitchen-rack': 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=800&auto=format&fit=crop&q=60',
  'desk-lamp': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=60',
  'arabica-coffee': 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=800&auto=format&fit=crop&q=60',
  'green-tea': 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=60',
  'bedsheet': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&auto=format&fit=crop&q=60',
  'womens-blouse': 'https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=800&auto=format&fit=crop&q=60',
  'womens-sandals': 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800&auto=format&fit=crop&q=60',
  'digital-watch': 'https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=800&auto=format&fit=crop&q=60',
  'mens-wallet': 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=800&auto=format&fit=crop&q=60',
  'laptop-stand': 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?w=800&auto=format&fit=crop&q=60',
  'webcam': 'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=800&auto=format&fit=crop&q=60',
  'smartwatch': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=60',
  'medical-mask': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=60',
  'vitamin-c': 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=60',
  'portable-vacuum': 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&auto=format&fit=crop&q=60',
  'nonstick-pan': 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=800&auto=format&fit=crop&q=60',
  'almond-chocolate': 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=800&auto=format&fit=crop&q=60',
  'cassava-chips': 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=800&auto=format&fit=crop&q=60',
  'mens-shirt': 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&auto=format&fit=crop&q=60',
  'mens-chino': 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&auto=format&fit=crop&q=60',
  'pleated-skirt': 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=800&auto=format&fit=crop&q=60',
  'womens-cardigan': '/images/womens_cardigan.png',
  'computer-glasses': '/images/clear_glasses.png',
  'baseball-cap': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&auto=format&fit=crop&q=60',
  'usb-flash-drive': '/images/usb_flash_drive.png',
  'external-ssd': '/images/external_ssd.png',
  'bluetooth-speaker': 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=60',
  'phone-tripod': '/images/tripod_stand.png',
  'storage-box': '/images/storage_box.png',
  'bath-mat': '/images/bath_mat.png',
  'digital-scale': 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800&auto=format&fit=crop&q=60',
  'eucalyptus-oil': '/images/eucalyptus_oil.png',
  'granola': '/images/granola_bowl.png',
  'chili-sauce': '/images/chili_sauce.png',
  'bomber-jacket': '/images/bomber_jacket.png',
  'hijab': 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=800&auto=format&fit=crop&q=60',
  'bracelet': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&auto=format&fit=crop&q=60',
  'laptop-cooling-pad': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=60',
  'usb-c-earphones': 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=60',
  'soap-dispenser': 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=60'
};

function productImage(keyword, index) {
  if (unsplashImages[keyword]) return unsplashImages[keyword];
  return `https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=60`;
}

export async function ensureSeedData() {
  await query(schemaSql);
  
  // Update all product image URLs by their names to ensure they are correct and relevant
  for (const item of products) {
    const url = unsplashImages[item[5]];
    if (url) {
      await query("UPDATE products SET image_url = $1 WHERE name = $2", [url, item[1]]);
    }
  }

  const existing = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM products) AS product_count,
      (SELECT COUNT(*)::int FROM categories WHERE slug IN ('elektronik', 'fashion-pria', 'fashion-wanita', 'peralatan-rumah', 'kesehatan', 'aksesoris', 'komputer-laptop', 'makanan-minuman')) AS category_count
  `);
  if (existing.rows[0].product_count >= 50 && existing.rows[0].category_count === 8) return;

  await transaction(async (client) => {
    await client.query('TRUNCATE order_items, orders, cart_items, carts, addresses, products, categories, users RESTART IDENTITY CASCADE');
    const passwordHash = await bcrypt.hash('Password123!', 12);

    const admin = await client.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role)
       VALUES ('KubeMarket Admin', 'admin@kubemarket.local', '+628110000001', $1, 'admin') RETURNING id`,
      [passwordHash]
    );

    const customerIds = [];
    for (let index = 1; index <= 20; index += 1) {
      const user = await client.query(
        `INSERT INTO users (full_name, email, phone, password_hash, role)
         VALUES ($1, $2, $3, $4, 'customer') RETURNING id`,
        [`Pelanggan ${index}`, `customer${index}@kubemarket.local`, `+62812${String(index).padStart(7, '0')}`, passwordHash]
      );
      customerIds.push(user.rows[0].id);
      await client.query(
        `INSERT INTO addresses (user_id, recipient_name, recipient_phone, province, city, district, postal_code, full_address, is_default)
         VALUES ($1,$2,$3,'DKI Jakarta','Jakarta Selatan','Kebayoran Baru','12110',$4,true)`,
        [user.rows[0].id, `Pelanggan ${index}`, `+62812${String(index).padStart(7, '0')}`, `Jl. Melati Raya No. ${index}`]
      );
    }

    const categoryIds = [];
    for (const category of categories) {
      const created = await client.query('INSERT INTO categories (name, slug, description) VALUES ($1,$2,$3) RETURNING id', category);
      categoryIds.push(created.rows[0].id);
    }

    const categoryMap = Object.fromEntries(categories.map((category, index) => [category[1], categoryIds[index]]));
    const productIds = [];
    for (let index = 0; index < products.length; index += 1) {
      const item = products[index];
      const product = await client.query(
        `INSERT INTO products (category_id, name, description, price, stock, image_url)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [
          categoryMap[item[0]],
          item[1],
          item[2],
          item[3],
          item[4],
          productImage(item[5], index)
        ]
      );
      productIds.push(product.rows[0].id);
    }

    for (let index = 0; index < 10; index += 1) {
      const userId = customerIds[index];
      const address = await client.query('SELECT id FROM addresses WHERE user_id=$1 LIMIT 1', [userId]);
      const order = await client.query(
        `INSERT INTO orders (user_id, address_id, status, total_amount, created_at)
         VALUES ($1,$2,$3,0,now() - ($4 || ' days')::interval) RETURNING id`,
        [userId, address.rows[0].id, index % 3 === 0 ? 'completed' : 'pending', index + 1]
      );
      let total = 0;
      for (let line = 0; line < 2; line += 1) {
        const productId = productIds[(index * 3 + line) % productIds.length];
        const product = await client.query('SELECT name, price FROM products WHERE id=$1', [productId]);
        const quantity = line + 1;
        const subtotal = Number(product.rows[0].price) * quantity;
        total += subtotal;
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [order.rows[0].id, productId, product.rows[0].name, quantity, product.rows[0].price, subtotal]
        );
      }
      await client.query('UPDATE orders SET total_amount=$1 WHERE id=$2', [total, order.rows[0].id]);
    }

    await client.query('INSERT INTO carts (user_id) VALUES ($1), ($2), ($3)', [customerIds[0], customerIds[1], admin.rows[0].id]);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  ensureSeedData()
    .then(() => {
      console.log('KubeMarket seed data ready');
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
