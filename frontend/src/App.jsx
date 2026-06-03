import { Component, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BarChart3, Boxes, ChevronRight, LayoutDashboard, LogOut,
  MapPin, Package, Search, ShoppingCart, Star, Store, Tag, User, Users
} from 'lucide-react';
import api from './api.js';

const AuthContext = createContext(null);
const formatIdr = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const statusText = {
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
};

function productMeta(id) {
  return {
    rating: (4.6 + (Number(id) % 4) / 10).toFixed(1),
    sold: 18 + (Number(id) * 17) % 480
  };
}

function useAuth() {
  return useContext(AuthContext);
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('kubemarket_user') || 'null');
  } catch {
    localStorage.removeItem('kubemarket_user');
    localStorage.removeItem('kubemarket_token');
    return null;
  }
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('KubeMarket render error', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto mt-10 max-w-lg rounded-lg bg-white p-6 text-center shadow-soft">
          <Store className="mx-auto mb-3 text-market-green" size={36} />
          <h1 className="text-xl font-bold">Halaman perlu dimuat ulang</h1>
          <p className="mt-2 text-sm text-gray-500">Terjadi masalah saat membuka halaman sebelumnya. Muat ulang atau kembali ke beranda untuk lanjut belanja.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button className="btn-secondary" onClick={() => window.history.back()}>Kembali</button>
            <button className="btn-primary" onClick={() => window.location.assign('/')}>Beranda</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = (payload) => {
    localStorage.setItem('kubemarket_token', payload.token);
    localStorage.setItem('kubemarket_user', JSON.stringify(payload.user));
    setUser(payload.user);
  };

  const logout = () => {
    localStorage.removeItem('kubemarket_token');
    localStorage.removeItem('kubemarket_user');
    setUser(null);
  };

  const value = useMemo(() => ({ user, login, logout, isAdmin: user?.role === 'admin' }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Shell() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');

  const search = (event) => {
    event.preventDefault();
    navigate(`/products${keyword ? `?search=${encodeURIComponent(keyword)}` : ''}`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-market-green">
              <Store size={28} /> KubeMarket
            </Link>
            <Link to="/cart" className="btn-secondary px-3 md:hidden" title="Keranjang"><ShoppingCart size={18} /></Link>
          </div>
          <form onSubmit={search} className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={17} />
            <input className="input pl-10" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Cari produk" />
          </form>
          <nav className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Link to="/products" className="hidden hover:text-market-green md:inline">Produk</Link>
            {user && <Link to="/orders" className="hidden hover:text-market-green md:inline">Riwayat Pesanan</Link>}
            {isAdmin && <Link to="/admin" className="hidden hover:text-market-green md:inline">Admin</Link>}
            <Link to="/cart" className="btn-secondary hidden px-3 md:inline-flex" title="Keranjang"><ShoppingCart size={18} /></Link>
            {user ? (
              <>
                <Link to="/profile" className="btn-secondary"><User size={16} /> <span className="hidden sm:inline">{user.fullName}</span></Link>
                <button className="btn-secondary px-3" onClick={logout} title="Keluar"><LogOut size={18} /></button>
              </>
            ) : (
              <>
                <Link className="btn-secondary" to="/login">Masuk</Link>
                <Link className="btn-primary" to="/register">Daftar</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<Protected><Cart /></Protected>} />
          <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/addresses" element={<Protected><Addresses /></Protected>} />
          <Route path="/orders" element={<Protected><Orders /></Protected>} />
          <Route path="/orders/:id" element={<Protected><OrderDetail /></Protected>} />
          <Route path="/admin" element={<AdminOnly><AdminDashboard /></AdminOnly>} />
          <Route path="/admin/products" element={<AdminOnly><AdminProducts /></AdminOnly>} />
          <Route path="/admin/categories" element={<AdminOnly><AdminCategories /></AdminOnly>} />
          <Route path="/admin/users" element={<AdminOnly><AdminUsers /></AdminOnly>} />
          <Route path="/admin/orders" element={<AdminOnly><AdminOrders /></AdminOnly>} />
        </Routes>
      </main>
    </div>
  );
}

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/" replace />;
}

function Home() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get('/products/categories').then((response) => setCategories(response.data.categories));
    api.get('/products', { params: { limit: 16 } }).then((response) => setProducts(response.data.products));
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-lg bg-gradient-to-r from-market-green via-green-500 to-emerald-400 p-6 text-white shadow-soft md:p-8">
          <p className="text-sm font-semibold">Promo KubeMarket</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Belanja Hemat untuk Kebutuhan Harian</h1>
          <p className="mt-3 max-w-2xl text-sm text-green-50">Temukan elektronik, fashion, perlengkapan rumah, makanan, dan produk favorit lain dengan harga menarik.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/products" className="btn bg-white text-market-green hover:bg-green-50">Mulai Belanja <ChevronRight size={16} /></Link>
            <Link to="/cart" className="btn border border-white/60 text-white hover:bg-white/10"><ShoppingCart size={16} /> Keranjang</Link>
          </div>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-soft">
          <h2 className="mb-4 flex items-center gap-2 font-bold"><Tag className="text-market-green" size={20} /> Kategori Pilihan</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {categories.slice(0, 8).map((category) => (
              <Link key={category.id} to={`/products?category=${category.slug}`} className="rounded-md border border-gray-200 p-3 hover:border-market-green hover:text-market-green">
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Produk Unggulan</h2>
            <p className="text-sm text-gray-500">Pilihan populer minggu ini</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-market-green">Lihat Semua</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Rekomendasi untuk Kamu</h2>
          <p className="text-sm text-gray-500">Produk terbaru dari berbagai toko</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(8, 16).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
    </div>
  );
}

function ProductList({ compact = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const category = searchParams.get('category') || '';

  useEffect(() => {
    api.get('/products/categories').then((response) => setCategories(response.data.categories));
  }, []);

  useEffect(() => {
    const params = { search: searchParams.get('search') || '', category, limit: compact ? 8 : 60 };
    api.get('/products', { params }).then((response) => setProducts(response.data.products));
  }, [searchParams, category, compact]);

  const submit = (event) => {
    event.preventDefault();
    setSearchParams({ ...(search ? { search } : {}), ...(category ? { category } : {}) });
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">{compact ? 'Produk Unggulan' : 'Daftar Produk'}</h2>
          <p className="text-sm text-gray-500">Cari produk favorit dengan harga terbaik.</p>
        </div>
        {!compact && (
          <form onSubmit={submit} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input className="input pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari produk" />
            </div>
            <button className="btn-primary">Cari</button>
          </form>
        )}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSearchParams(search ? { search } : {})} className={`btn-secondary ${!category ? 'border-market-green text-market-green' : ''}`}>Semua</button>
          {categories.map((item) => (
            <button key={item.id} onClick={() => setSearchParams({ ...(search ? { search } : {}), category: item.slug })} className={`btn-secondary ${category === item.slug ? 'border-market-green text-market-green' : ''}`}>{item.name}</button>
          ))}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => <ProductCard key={product.id} product={product} />)}
      </div>
    </section>
  );
}

function ProductCard({ product }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const meta = productMeta(product.id);

  const addToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return navigate('/login');
    await api.post('/cart/items', { productId: Number(product.id), quantity: 1 });
    navigate('/cart', { replace: false });
  };

  return (
    <article className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
      <Link to={`/products/${product.id}`}>
        <img src={product.image_url} alt={product.name} className="h-44 w-full bg-gray-100 object-cover" />
      </Link>
      <div className="space-y-2 p-4">
        <p className="text-xs font-semibold text-market-green">{product.category_name}</p>
        <Link to={`/products/${product.id}`} className="line-clamp-2 block min-h-10 font-semibold hover:text-market-green">{product.name}</Link>
        <p className="font-bold text-market-orange">{formatIdr(product.price)}</p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Stok {product.stock}</span>
          <span className="flex items-center gap-1"><Star size={13} className="fill-yellow-400 text-yellow-400" /> {meta.rating} | Terjual {meta.sold}</span>
        </div>
        <button type="button" className="btn-primary w-full" onClick={addToCart}><ShoppingCart size={16} /> Tambah ke Keranjang</button>
      </div>
    </article>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    api.get(`/products/${id}`).then((response) => setProduct(response.data.product));
  }, [id]);

  const addToCart = async () => {
    if (!user) return navigate('/login');
    await api.post('/cart/items', { productId: Number(id), quantity });
    navigate('/cart', { replace: false });
  };

  const buyNow = async () => {
    if (!user) return navigate('/login');
    await api.post('/cart/items', { productId: Number(id), quantity });
    navigate('/checkout', { replace: false });
  };

  if (!product) return <Loading />;
  const meta = productMeta(product.id);
  return (
    <div className="grid gap-6 rounded-lg bg-white p-6 shadow-soft md:grid-cols-2">
      <img src={product.image_url} alt={product.name} className="aspect-[4/3] w-full rounded-md bg-gray-100 object-cover" />
      <div className="space-y-5">
        <span className="pill">{product.category_name}</span>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Star size={16} className="fill-yellow-400 text-yellow-400" /> {meta.rating} penilaian | Terjual {meta.sold}
        </div>
        <p className="text-2xl font-bold text-market-orange">{formatIdr(product.price)}</p>
        <p className="text-gray-600">{product.description}</p>
        <div className="flex items-center gap-3">
          <input className="input max-w-24" type="number" min="1" max={product.stock} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} />
          <span className="text-sm text-gray-500">Stok tersedia {product.stock}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={addToCart}><ShoppingCart size={18} /> Tambah ke Keranjang</button>
          <button type="button" className="btn-primary" onClick={buyNow}>Beli Sekarang</button>
        </div>
      </div>
    </div>
  );
}

function AuthForm({ mode }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const isRegister = mode === 'register';

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const payload = isRegister ? form : { email: form.email, password: form.password };
      const { data } = await api.post(endpoint, payload);
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Proses autentikasi gagal');
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-soft">
      <h1 className="mb-4 text-2xl font-bold">{isRegister ? 'Daftar' : 'Masuk'}</h1>
      {error && <p className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form onSubmit={submit} className="space-y-3">
        {isRegister && <input className="input" placeholder="Nama lengkap" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />}
        <input className="input" placeholder="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        {isRegister && <input className="input" placeholder="Nomor telepon" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />}
        <input className="input" placeholder="Kata sandi" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        {isRegister && <input className="input" placeholder="Konfirmasi kata sandi" type="password" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />}
        <button className="btn-primary w-full">{isRegister ? 'Daftar' : 'Masuk'}</button>
      </form>
      <p className="mt-4 text-sm text-gray-500">Akun admin demo: admin@kubemarket.local / Password123!</p>
    </div>
  );
}

function Login() { return <AuthForm mode="login" />; }
function Register() { return <AuthForm mode="register" />; }

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], total: 0 });
  const load = () => api.get('/cart').then((response) => setCart(response.data.cart));
  useEffect(load, []);
  const remove = async (id) => { await api.delete(`/cart/items/${id}`); load(); };

  return (
    <Panel title="Keranjang" icon={ShoppingCart}>
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center">
            <img src={item.image_url} className="h-20 w-20 rounded bg-gray-100 object-cover" alt={item.name} />
            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-gray-500">{item.quantity} x {formatIdr(item.price)}</p>
            </div>
            <p className="font-bold">{formatIdr(item.subtotal)}</p>
            <button className="btn-secondary" onClick={() => remove(item.id)}>Hapus</button>
          </div>
        ))}
        {!cart.items.length && <Empty text="Keranjang masih kosong." />}
        <div className="flex flex-col items-start justify-between gap-3 border-t pt-4 sm:flex-row sm:items-center">
          <p className="text-lg font-bold">Total {formatIdr(cart.total)}</p>
          <button disabled={!cart.items.length} className="btn-primary" onClick={() => navigate('/checkout')}>Checkout</button>
        </div>
      </div>
    </Panel>
  );
}

function Checkout() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState('');
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const cartItems = Array.isArray(cart?.items) ? cart.items : [];

  useEffect(() => {
    let active = true;

    Promise.all([api.get('/addresses'), api.get('/cart')])
      .then(([addressResponse, cartResponse]) => {
        if (!active) return;
        const addressList = Array.isArray(addressResponse.data?.addresses) ? addressResponse.data.addresses : [];
        setAddresses(addressList);
        setCart(cartResponse.data?.cart || { items: [], total: 0 });
        if (!addressList.length) navigate('/addresses?checkout=1', { replace: true });
        else setSelected(addressList[0].id);
      })
      .catch(() => {
        if (active) setError('Gagal memuat data checkout. Silakan coba lagi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [navigate]);

  const submit = async () => {
    try {
      const { data } = await api.post('/orders/checkout', { addressId: Number(selected) });
      navigate(`/orders/${data.order.id}`, { replace: true });
    } catch {
      setError('Pesanan gagal dibuat. Periksa keranjang dan alamat pengiriman.');
    }
  };

  if (loading) return <Loading />;

  return (
    <Panel title="Checkout" icon={Package}>
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <h2 className="font-bold">Alamat Pengiriman</h2>
          {addresses.map((address) => (
            <label key={address.id} className="flex cursor-pointer gap-3 rounded-md border border-gray-200 p-4">
              <input type="radio" checked={Number(selected) === address.id} onChange={() => setSelected(address.id)} />
              <span>
                <b>{address.recipient_name}</b> {address.recipient_phone}<br />
                <span className="text-sm text-gray-500">{address.full_address}, {address.district}, {address.city}, {address.province} {address.postal_code}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="rounded-md border border-gray-200 p-4">
          <h3 className="mb-3 font-bold">Ringkasan Belanja</h3>
          <div className="mb-4 space-y-3">
            {cartItems.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                <img src={item.image_url} alt={item.name} className="h-14 w-14 rounded bg-gray-100 object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.quantity} x {formatIdr(item.price)}</p>
                </div>
                <p className="text-sm font-bold">{formatIdr(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500">{cartItems.length} produk</p>
          <p className="mb-4 text-xl font-bold">{formatIdr(cart.total)}</p>
          {!cartItems.length && <p className="mb-4 rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">Keranjang kosong. Tambahkan produk sebelum checkout.</p>}
          <div className="space-y-3">
            <button type="button" className="btn-secondary w-full" onClick={() => navigate('/cart')}>Kembali ke Keranjang</button>
            <button className="btn-primary w-full" onClick={submit} disabled={!selected || !cartItems.length}>Buat Pesanan</button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Profile() {
  const { user } = useAuth();
  return (
    <Panel title="Profil Saya" icon={User}>
      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Nama lengkap" value={user.fullName} />
        <Info label="Email" value={user.email} />
        <Info label="Nomor telepon" value={user.phone} />
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link className="btn-secondary" to="/addresses"><MapPin size={16} /> Kelola Alamat</Link>
        <Link className="btn-secondary" to="/orders"><Package size={16} /> Riwayat Pesanan</Link>
      </div>
    </Panel>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', province: '', city: '', district: '', postalCode: '', fullAddress: '', isDefault: true });
  const load = () => api.get('/addresses').then((response) => setAddresses(response.data.addresses));
  useEffect(load, []);
  const submit = async (event) => {
    event.preventDefault();
    await api.post('/addresses', form);
    setForm({ recipientName: '', recipientPhone: '', province: '', city: '', district: '', postalCode: '', fullAddress: '', isDefault: true });
    load();
  };

  return (
    <Panel title="Alamat Pengiriman" icon={MapPin}>
      <form onSubmit={submit} className="mb-6 grid gap-3 md:grid-cols-2">
        {[
          ['recipientName', 'Nama penerima'], ['recipientPhone', 'Nomor penerima'], ['province', 'Provinsi'],
          ['city', 'Kota'], ['district', 'Kecamatan'], ['postalCode', 'Kode pos']
        ].map(([key, label]) => <input key={key} className="input" placeholder={label} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />)}
        <textarea className="input md:col-span-2" placeholder="Alamat lengkap" value={form.fullAddress} onChange={(event) => setForm({ ...form, fullAddress: event.target.value })} />
        <button className="btn-primary md:col-span-2">Simpan Alamat</button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {addresses.map((address) => (
          <div className="rounded-md border border-gray-200 p-4" key={address.id}>
            <p className="font-bold">{address.recipient_name}</p>
            <p className="text-sm text-gray-500">{address.full_address}, {address.city}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/orders').then((response) => setOrders(response.data.orders)); }, []);
  return <OrdersTable title="Riwayat Pesanan" orders={orders} base="/orders" />;
}

function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => { api.get(`/orders/${id}`).then((response) => setOrder(response.data.order)); }, [id]);
  if (!order) return <Loading />;

  return (
    <Panel title={`Pesanan #${order.id}`} icon={Package}>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Info label="Status" value={statusText[order.status] || order.status} />
        <Info label="Total" value={formatIdr(order.total_amount)} />
        <Info label="Dikirim ke" value={`${order.recipient_name}, ${order.city}`} />
      </div>
      {order.items.map((item) => (
        <div className="flex justify-between border-t py-3" key={item.id}>
          <span>{item.product_name} x {item.quantity}</span>
          <b>{formatIdr(item.subtotal)}</b>
        </div>
      ))}
    </Panel>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/dashboard').then((response) => setStats(response.data.stats)); }, []);
  if (!stats) return <Loading />;

  return (
    <Panel title="Dashboard Admin" icon={LayoutDashboard}>
      <AdminNav />
      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <Info label="Penjualan" value={formatIdr(stats.totalSales)} />
        <Info label="Pelanggan" value={stats.totalUsers} />
        <Info label="Produk" value={stats.totalProducts} />
        <Info label="Pesanan" value={stats.totalOrders} />
      </div>
      <div className="mt-5 rounded-md border border-gray-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold"><BarChart3 size={18} /> Statistik Penjualan</h3>
        {stats.dailySales.map((day) => <p key={day.day} className="flex justify-between border-t py-2"><span>{day.day}</span><b>{formatIdr(day.sales)}</b></p>)}
      </div>
    </Panel>
  );
}

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ categoryId: '', name: '', description: '', price: 100000, stock: 10, imageUrl: 'https://loremflickr.com/800/600/product?lock=999' });
  const load = () => api.get('/products', { params: { limit: 100 } }).then((response) => setProducts(response.data.products));

  useEffect(() => {
    load();
    api.get('/products/categories').then((response) => {
      setCategories(response.data.categories);
      setForm((current) => ({ ...current, categoryId: response.data.categories[0]?.id || '' }));
    });
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    await api.post('/products', { ...form, categoryId: Number(form.categoryId), price: Number(form.price), stock: Number(form.stock), isActive: true });
    setForm({ ...form, name: '', description: '' });
    load();
  };

  const deactivate = async (id) => {
    await api.delete(`/products/${id}`);
    load();
  };

  return (
    <Panel title="Kelola Produk" icon={Boxes}>
      <AdminNav />
      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-md border border-gray-200 p-4 md:grid-cols-3">
        <select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input className="input" placeholder="Nama produk" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="input" placeholder="URL gambar" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
        <input className="input" type="number" placeholder="Harga" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        <input className="input" type="number" placeholder="Stok" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} />
        <textarea className="input" placeholder="Deskripsi" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <button className="btn-primary md:col-span-3">Tambah Produk</button>
      </form>
      <DataTable columns={['ID', 'Nama', 'Kategori', 'Harga', 'Stok', 'Aksi']} rows={products.map((product) => [product.id, product.name, product.category_name, formatIdr(product.price), product.stock, <button className="text-red-600" onClick={() => deactivate(product.id)}>Nonaktifkan</button>])} />
    </Panel>
  );
}

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const load = () => api.get('/admin/categories').then((response) => setCategories(response.data.categories));
  useEffect(load, []);
  const submit = async (event) => {
    event.preventDefault();
    await api.post('/admin/categories', form);
    setForm({ name: '', slug: '', description: '' });
    load();
  };
  const remove = async (id) => {
    await api.delete(`/admin/categories/${id}`);
    load();
  };

  return (
    <Panel title="Kelola Kategori" icon={Tag}>
      <AdminNav />
      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-md border border-gray-200 p-4 md:grid-cols-3">
        <input className="input" placeholder="Nama kategori" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: event.target.value.toLowerCase().replaceAll(' ', '-') })} />
        <input className="input" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} />
        <input className="input" placeholder="Deskripsi" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <button className="btn-primary md:col-span-3">Tambah Kategori</button>
      </form>
      <DataTable columns={['ID', 'Nama', 'Slug', 'Deskripsi', 'Aksi']} rows={categories.map((category) => [category.id, category.name, category.slug, category.description, <button className="text-red-600" onClick={() => remove(category.id)}>Hapus</button>])} />
    </Panel>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  useEffect(() => { api.get('/admin/users').then((response) => setUsers(response.data.users)); }, []);
  return (
    <Panel title="Kelola Pengguna" icon={Users}>
      <AdminNav />
      <DataTable columns={['ID', 'Nama', 'Email', 'Peran', 'Aktif']} rows={users.map((user) => [user.id, user.full_name, user.email, user.role === 'admin' ? 'Admin' : 'Pelanggan', user.is_active ? 'Ya' : 'Tidak'])} />
    </Panel>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/admin/orders').then((response) => setOrders(response.data.orders)); }, []);
  return <OrdersTable title="Kelola Pesanan" orders={orders} admin />;
}

function OrdersTable({ title, orders, base = '', admin = false }) {
  return (
    <Panel title={title} icon={Package}>
      {admin && <AdminNav />}
      <DataTable
        columns={admin ? ['ID', 'Pelanggan', 'Status', 'Total', 'Kota'] : ['ID', 'Status', 'Total', 'Kota', 'Detail']}
        rows={orders.map((order) => admin
          ? [order.id, order.full_name || order.recipient_name, statusText[order.status] || order.status, formatIdr(order.total_amount), order.city]
          : [order.id, statusText[order.status] || order.status, formatIdr(order.total_amount), order.city, <Link className="text-market-green" to={`${base}/${order.id}`}>Lihat</Link>])}
      />
    </Panel>
  );
}

function AdminNav() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link className="btn-secondary" to="/admin"><LayoutDashboard size={16} /> Dashboard</Link>
      <Link className="btn-secondary" to="/admin/products"><Boxes size={16} /> Kelola Produk</Link>
      <Link className="btn-secondary" to="/admin/categories"><Tag size={16} /> Kelola Kategori</Link>
      <Link className="btn-secondary" to="/admin/users"><Users size={16} /> Kelola Pengguna</Link>
      <Link className="btn-secondary" to="/admin/orders"><Package size={16} /> Kelola Pesanan</Link>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-soft">
      <h1 className="mb-5 flex items-center gap-2 text-2xl font-bold">{Icon && <Icon className="text-market-green" />} {title}</h1>
      {children}
    </section>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>{columns.map((column) => <th className="px-3 py-2 font-semibold" key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={index} className="border-t">{row.map((cell, cellIndex) => <td className="px-3 py-3" key={cellIndex}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-md border border-gray-200 p-4"><p className="text-xs font-semibold uppercase text-gray-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}

function Loading() { return <div className="rounded-lg bg-white p-6 shadow-soft">Memuat...</div>; }
function Empty({ text }) { return <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-500">{text}</div>; }

export default function App() {
  const location = useLocation();

  return <ErrorBoundary key={location.pathname}><AuthProvider><Shell /></AuthProvider></ErrorBoundary>;
}
