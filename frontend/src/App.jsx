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
    this.state = { hasError: false, prevPath: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('KubeMarket render error', error);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.location && props.location.pathname !== state.prevPath) {
      return {
        hasError: false,
        prevPath: props.location.pathname
      };
    }
    return null;
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

  const updateUser = (updatedUser) => {
    localStorage.setItem('kubemarket_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const value = useMemo(() => ({ user, login, logout, updateUser, isAdmin: user?.role === 'admin' }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function Shell() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const location = useLocation();

  const search = (event) => {
    event.preventDefault();
    navigate(`/products${keyword ? `?search=${encodeURIComponent(keyword)}` : ''}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="glass-header">
        <div className="mx-auto flex max-w-[1600px] w-full flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold tracking-tight bg-gradient-to-r from-market-green to-emerald-600 bg-clip-text text-transparent">
              <Store size={28} className="text-market-green" /> KubeMarket
            </Link>
            <Link to="/cart" className="btn-secondary px-3 md:hidden" title="Keranjang"><ShoppingCart size={18} /></Link>
          </div>
          <form onSubmit={search} className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={17} />
            <input className="input pl-10" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Cari barang murah meriah di sini..." />
          </form>
          <nav className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <Link to="/products" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-market-green transition">Produk</Link>
            {user && <Link to="/orders" className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-market-green transition">Pesanan</Link>}
            {isAdmin && <Link to="/admin" className="px-3 py-2 rounded-lg bg-emerald-50 text-market-green hover:bg-emerald-100 transition font-semibold">Admin</Link>}
            <Link to="/cart" className="btn-secondary hidden px-3 md:inline-flex" title="Keranjang"><ShoppingCart size={18} /></Link>
            {user ? (
              <>
                <Link to="/profile" className="btn-secondary font-medium"><User size={16} /> <span>{user.fullName}</span></Link>
                <button className="btn-secondary px-3 text-rose-500 hover:text-rose-600 hover:border-rose-200" onClick={logout} title="Keluar"><LogOut size={18} /></button>
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
      <main className="mx-auto max-w-[1600px] w-full px-4 py-6">
        <ErrorBoundary location={location}>
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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
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
    let active = true;

    api.get('/products/categories')
      .then((response) => active && setCategories(response.data.categories || []))
      .catch(() => active && setCategories([]));
    api.get('/products', { params: { limit: 16 } })
      .then((response) => active && setProducts(response.data.products || []))
      .catch(() => active && setProducts([]));

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-market-green via-emerald-600 to-green-700 p-8 text-white shadow-lg relative flex flex-col justify-between min-h-[220px]">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-white backdrop-blur-sm">Promo KubeMarket</span>
            <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl leading-tight">Belanja Hemat & Cepat<br />Kebutuhan Harian Anda</h1>
            <p className="max-w-xl text-sm text-emerald-100 font-medium">Temukan elektronik, fashion, kebutuhan rumah tangga dengan promo gratis ongkir dan diskon menarik setiap hari.</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/products" className="btn bg-white text-market-green hover:bg-emerald-50 shadow-md">Mulai Belanja <ChevronRight size={16} /></Link>
            <Link to="/cart" className="btn border border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"><ShoppingCart size={16} /> Keranjang</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft flex flex-col justify-between">
          <div>
            <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-800"><Tag className="text-market-green" size={20} /> Kategori Pilihan</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {categories.slice(0, 8).map((category) => (
                <Link key={category.id} to={`/products?category=${category.slug}`} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:border-market-green hover:text-market-green hover:bg-white transition-all text-center font-medium block">
                  {category.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Produk Unggulan</h2>
            <p className="text-sm text-slate-500">Pilihan produk terpopuler pilihan kami</p>
          </div>
          <Link to="/products" className="text-sm font-semibold text-market-green hover:underline">Lihat Semua</Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 8).map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>
      <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Rekomendasi Spesial</h2>
          <p className="text-sm text-slate-500">Disesuaikan khusus untuk minat belanja Anda</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    let active = true;
    api.get('/products/categories')
      .then((response) => active && setCategories(response.data.categories || []))
      .catch(() => active && setCategories([]));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = { search: searchParams.get('search') || '', category, limit: compact ? 8 : 60 };
    api.get('/products', { params })
      .then((response) => active && setProducts(response.data.products || []))
      .catch(() => active && setProducts([]));

    return () => {
      active = false;
    };
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
    try {
      await api.post('/cart/items', { productId: Number(product.id), quantity: 1 });
      navigate('/cart', { replace: false });
    } catch {
      window.alert('Gagal menambahkan produk ke keranjang. Coba lagi sebentar.');
    }
  };

  return (
    <article className="overflow-hidden rounded-xl border border-slate-100 bg-white card-hover flex flex-col justify-between">
      <Link to={`/products/${product.id}`} className="relative block overflow-hidden group">
        <img src={product.image_url} alt={product.name} className="h-44 w-full bg-slate-50 object-cover transition-transform duration-300 group-hover:scale-105" />
      </Link>
      <div className="flex-1 flex flex-col justify-between p-4 space-y-3">
        <div className="space-y-1">
          <span className="pill-default text-[10px] uppercase font-bold tracking-wider">{product.category_name}</span>
          <Link to={`/products/${product.id}`} className="line-clamp-2 block text-sm font-semibold text-slate-800 hover:text-market-green transition-colors min-h-[40px] leading-tight">
            {product.name}
          </Link>
        </div>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <p className="text-base font-bold text-market-orange">{formatIdr(product.price)}</p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-50 pt-2.5">
            <span>Stok {product.stock}</span>
            <span className="flex items-center gap-1 font-medium"><Star size={13} className="fill-amber-400 text-amber-400" /> {meta.rating} <span className="text-slate-300">|</span> {meta.sold} terjual</span>
          </div>
          <button type="button" className="btn-primary w-full text-xs py-2 shadow-none" onClick={addToCart}>
            <ShoppingCart size={14} /> Beli
          </button>
        </div>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setProduct(null);

    api.get(`/products/${id}`)
      .then((response) => {
        if (!active) return;
        setProduct(response.data.product || null);
        if (!response.data.product) setError('Produk tidak ditemukan.');
      })
      .catch(() => active && setError('Gagal memuat produk. Silakan kembali ke daftar produk.'))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id]);

  const addToCart = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/cart/items', { productId: Number(id), quantity });
      navigate('/cart', { replace: false });
    } catch {
      window.alert('Gagal menambahkan produk ke keranjang. Coba lagi sebentar.');
    }
  };

  const buyNow = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post('/cart/items', { productId: Number(id), quantity });
      navigate('/checkout', { replace: false });
    } catch {
      window.alert('Gagal memproses produk. Coba lagi sebentar.');
    }
  };

  if (loading) return <Loading />;
  if (error || !product) return <EmptyState title="Produk belum bisa ditampilkan" text={error || 'Produk tidak ditemukan.'} action={<Link className="btn-primary" to="/products">Kembali ke Produk</Link>} />;
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
  const [error, setError] = useState('');
  const load = () => api.get('/cart')
    .then((response) => {
      setCart(response.data.cart || { items: [], total: 0 });
      setError('');
    })
    .catch(() => setError('Gagal memuat keranjang. Silakan coba lagi.'));
  useEffect(() => { load(); }, []);
  
  const remove = async (id) => {
    try {
      await api.delete(`/cart/items/${id}`);
      load();
    } catch {
      setError('Produk gagal dihapus dari keranjang.');
    }
  };

  const updateQty = async (itemId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      remove(itemId);
      return;
    }
    try {
      await api.put(`/cart/items/${itemId}`, { quantity: newQty });
      load();
    } catch {
      setError('Gagal memperbarui jumlah produk.');
    }
  };

  const handleQtyChange = async (itemId, val) => {
    const newQty = parseInt(val, 10);
    if (isNaN(newQty) || newQty <= 0) return;
    try {
      await api.put(`/cart/items/${itemId}`, { quantity: newQty });
      load();
    } catch {
      setError('Gagal memperbarui jumlah produk.');
    }
  };

  return (
    <Panel title="Keranjang Belanja" icon={ShoppingCart}>
      {error && <InlineError text={error} />}
      <div className="space-y-3">
        {cart.items.map((item) => (
          <div key={item.id} className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-4 sm:flex-row sm:items-center">
            <img src={item.image_url} className="h-20 w-20 rounded-lg bg-slate-50 object-cover" alt={item.name} />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-slate-800">{item.name}</p>
              <p className="text-sm text-slate-500">{formatIdr(item.price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => updateQty(item.id, item.quantity, -1)}>-</button>
              <input
                type="number"
                min="1"
                className="input py-1 px-2 text-center w-14 border-slate-200"
                value={item.quantity}
                onChange={(e) => handleQtyChange(item.id, e.target.value)}
              />
              <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => updateQty(item.id, item.quantity, 1)}>+</button>
            </div>
            <div className="text-right sm:min-w-[120px]">
              <p className="font-bold text-market-orange">{formatIdr(item.subtotal)}</p>
            </div>
            <button className="btn-danger py-1 px-3 text-xs" onClick={() => remove(item.id)}>Hapus</button>
          </div>
        ))}
        {!cart.items.length && <Empty text="Keranjang masih kosong." />}
        <div className="flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Pembayaran</p>
            <p className="text-2xl font-bold text-market-orange">{formatIdr(cart.total)}</p>
          </div>
          <button disabled={!cart.items.length} className="btn-primary px-6" onClick={() => navigate('/checkout')}>Lanjut ke Checkout</button>
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
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({ fullName: user?.fullName || '', phone: user?.phone || '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await api.put('/auth/me', form);
      updateUser(data.user);
      setSuccess('Profil berhasil diperbarui.');
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memperbarui profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Profil Saya" icon={User}>
      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-market-green font-bold text-2xl">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h3 className="mt-3 font-bold text-slate-800">{user?.fullName}</h3>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link className="btn-secondary w-full" to="/addresses"><MapPin size={16} /> Kelola Alamat</Link>
            <Link className="btn-secondary w-full" to="/orders"><Package size={16} /> Riwayat Pesanan</Link>
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 p-6 space-y-4 bg-white">
          <h2 className="text-lg font-bold text-slate-800">Ubah Data Diri</h2>
          {success && <p className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700 font-semibold">{success}</p>}
          {error && <p className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700 font-semibold">{error}</p>}
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Email (Tidak dapat diubah)</label>
              <input className="input bg-slate-50 text-slate-500" value={user?.email} disabled />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nama Lengkap</label>
              <input className="input" placeholder="Nama Lengkap" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase">Nomor Telepon</label>
              <input className="input" placeholder="Nomor Telepon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', province: '', city: '', district: '', postalCode: '', fullAddress: '', isDefault: false });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const load = () => api.get('/addresses')
    .then((response) => {
      setAddresses(response.data.addresses || []);
      setError('');
    })
    .catch(() => setError('Gagal memuat alamat pengiriman.'));

  useEffect(() => { load(); }, []);

  const edit = (address) => {
    setEditingId(address.id);
    setForm({
      recipientName: address.recipient_name,
      recipientPhone: address.recipient_phone,
      province: address.province,
      city: address.city,
      district: address.district,
      postalCode: address.postal_code,
      fullAddress: address.full_address,
      isDefault: address.is_default
    });
  };

  const removeAddress = async (id) => {
    if (!window.confirm('Hapus alamat ini?')) return;
    try {
      await api.delete(`/addresses/${id}`);
      await load();
    } catch {
      setError('Gagal menghapus alamat.');
    }
  };

  const setDefault = async (address) => {
    try {
      await api.put(`/addresses/${address.id}`, {
        recipientName: address.recipient_name,
        recipientPhone: address.recipient_phone,
        province: address.province,
        city: address.city,
        district: address.district,
        postalCode: address.postal_code,
        fullAddress: address.full_address,
        isDefault: true
      });
      await load();
    } catch {
      setError('Gagal menetapkan alamat utama.');
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, isDefault: !!form.isDefault };
      if (editingId) {
        await api.put(`/addresses/${editingId}`, payload);
      } else {
        await api.post('/addresses', payload);
      }
      setEditingId(null);
      setForm({ recipientName: '', recipientPhone: '', province: '', city: '', district: '', postalCode: '', fullAddress: '', isDefault: false });
      await load();
      if (searchParams.get('checkout') === '1') navigate('/checkout', { replace: true });
    } catch (err) {
      if (err.response?.data?.errors) {
        const fieldErrors = err.response.data.errors;
        const msg = Object.entries(fieldErrors)
          .map(([field, errors]) => {
            const label = {
              recipientName: 'Nama penerima',
              recipientPhone: 'Nomor penerima',
              province: 'Provinsi',
              city: 'Kota',
              district: 'Kecamatan',
              postalCode: 'Kode pos',
              fullAddress: 'Alamat lengkap'
            }[field] || field;
            
            const formattedErrors = errors.map(e => {
              if (e.includes('at least')) {
                const chars = e.match(/\d+/)?.[0] || '8';
                return `minimal ${chars} karakter`;
              }
              return e;
            });
            return `${label} ${formattedErrors.join(', ')}`;
          })
          .join('. ');
        setError(`Alamat gagal disimpan: ${msg}.`);
      } else {
        setError(err.response?.data?.message || 'Alamat gagal disimpan. Lengkapi semua data lalu coba lagi.');
      }
    }
  };

  return (
    <Panel title="Alamat Pengiriman" icon={MapPin}>
      {error && <InlineError text={error} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-xl border border-slate-100 p-5 bg-white space-y-4">
          <h2 className="text-lg font-bold text-slate-800">{editingId ? 'Edit Alamat' : 'Tambah Alamat Baru'}</h2>
          <form onSubmit={submit} className="space-y-3">
            {[
              ['recipientName', 'Nama penerima'], ['recipientPhone', 'Nomor penerima'], ['province', 'Provinsi'],
              ['city', 'Kota'], ['district', 'Kecamatan'], ['postalCode', 'Kode pos']
            ].map(([key, label]) => (
              <input key={key} className="input" placeholder={label} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} required />
            ))}
            <textarea className="input" placeholder="Alamat lengkap (nama jalan, nomor rumah, RT/RW)" value={form.fullAddress} onChange={(event) => setForm({ ...form, fullAddress: event.target.value })} required />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
              Atur sebagai alamat utama
            </label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1">{editingId ? 'Simpan' : 'Tambah'}</button>
              {editingId && <button type="button" className="btn-secondary" onClick={() => {
                setEditingId(null);
                setForm({ recipientName: '', recipientPhone: '', province: '', city: '', district: '', postalCode: '', fullAddress: '', isDefault: false });
              }}>Batal</button>}
            </div>
          </form>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Daftar Alamat</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <div className={`rounded-xl border p-4 bg-white space-y-3 relative flex flex-col justify-between ${address.is_default ? 'border-market-green shadow-soft shadow-emerald-500/5' : 'border-slate-150'}`} key={address.id}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">{address.recipient_name}</p>
                    {address.is_default && <span className="pill-completed text-[9px] px-1.5 py-0.5 font-bold uppercase">Utama</span>}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{address.recipient_phone}</p>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{address.full_address}, Kec. {address.district}, {address.city}, Prov. {address.province} - {address.postal_code}</p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
                  <button type="button" className="btn-secondary py-1 px-2.5 text-xs" onClick={() => edit(address)}>Sunting</button>
                  <button type="button" className="btn-danger py-1 px-2.5 text-xs" onClick={() => removeAddress(address.id)}>Hapus</button>
                  {!address.is_default && <button type="button" className="btn-secondary py-1 px-2.5 text-xs hover:bg-emerald-50" onClick={() => setDefault(address)}>Jadikan Utama</button>}
                </div>
              </div>
            ))}
            {addresses.length === 0 && <div className="md:col-span-2"><Empty text="Belum ada alamat pengiriman yang terdaftar." /></div>}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/orders')
      .then((response) => active && setOrders(response.data.orders || []))
      .catch(() => active && setError('Gagal memuat riwayat pesanan.'));

    return () => {
      active = false;
    };
  }, []);
  if (error) return <EmptyState title="Riwayat belum bisa ditampilkan" text={error} action={<Link className="btn-primary" to="/">Kembali Belanja</Link>} />;
  return <OrdersTable title="Riwayat Pesanan" orders={orders} base="/orders" />;
}

function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = () => {
    setLoading(true);
    setError('');
    api.get(`/orders/${id}`)
      .then((response) => {
        setOrder(response.data.order || null);
        if (!response.data.order) setError('Pesanan tidak ditemukan.');
      })
      .catch(() => setError('Gagal memuat detail pesanan.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handlePay = async () => {
    try {
      await api.post(`/orders/${id}/pay`);
      loadOrder();
    } catch {
      window.alert('Gagal memproses pembayaran.');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan pesanan ini?')) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      loadOrder();
    } catch {
      window.alert('Gagal membatalkan pesanan.');
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Apakah Anda yakin barang sudah diterima dengan baik?')) return;
    try {
      await api.post(`/orders/${id}/complete`);
      loadOrder();
    } catch {
      window.alert('Gagal menyelesaikan pesanan.');
    }
  };

  if (loading) return <Loading />;
  if (error || !order) return <EmptyState title="Detail pesanan belum bisa ditampilkan" text={error || 'Pesanan tidak ditemukan.'} action={<Link className="btn-primary" to="/orders">Kembali ke Riwayat</Link>} />;

  return (
    <Panel title={`Detail Pesanan #${order.id}`} icon={Package}>
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <div className="panel-card space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase">Status Transaksi</p>
          <div>
            <span className={`pill pill-${order.status} text-sm`}>{statusText[order.status] || order.status}</span>
          </div>
        </div>
        <div className="panel-card space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase">Total Pembayaran</p>
          <p className="text-lg font-bold text-market-orange">{formatIdr(order.total_amount)}</p>
        </div>
        <div className="panel-card space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase">Metode Pengiriman</p>
          <p className="text-sm font-bold text-slate-800">Kurir KubeMarket Express</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[2fr_1fr] items-start">
        <div className="panel-card space-y-4">
          <h2 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-3">Produk yang Dibeli</h2>
          <div className="space-y-4">
            {order.items.map((item) => (
              <div className="flex items-center justify-between py-1 last:border-b-0" key={item.id}>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{item.product_name}</p>
                  <p className="text-xs text-slate-500 font-medium">{item.quantity} x {formatIdr(item.unit_price)}</p>
                </div>
                <b className="text-sm text-slate-800">{formatIdr(item.subtotal)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel-card space-y-3">
            <h2 className="text-lg font-bold text-slate-800 border-b border-slate-50 pb-3">Alamat Pengiriman</h2>
            <div className="text-sm space-y-1 text-slate-600">
              <p className="font-bold text-slate-800">{order.recipient_name}</p>
              <p className="text-xs font-semibold text-slate-500">{order.recipient_phone}</p>
              <p className="mt-2 text-xs leading-relaxed">
                {order.full_address}, Kec. {order.district}, {order.city}, {order.province} - {order.postal_code}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {order.status === 'pending' && (
              <>
                <button type="button" className="btn-primary w-full shadow-md" onClick={handlePay}>Bayar Sekarang</button>
                <button type="button" className="btn-danger w-full" onClick={handleCancel}>Batalkan Pesanan</button>
              </>
            )}
            {order.status === 'shipped' && (
              <button type="button" className="btn-success w-full shadow-md font-semibold text-white shadow-emerald-500/10" onClick={handleComplete}>Pesanan Diterima</button>
            )}
            <Link className="btn-secondary w-full" to="/orders">Kembali ke Riwayat</Link>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/admin/dashboard')
      .then((response) => active && setStats(response.data.stats || null))
      .catch(() => active && setError('Gagal memuat dashboard admin.'))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, []);
  if (loading) return <Loading />;
  if (error || !stats) return <EmptyState title="Dashboard belum bisa ditampilkan" text={error || 'Data dashboard tidak tersedia.'} action={<Link className="btn-primary" to="/">Kembali ke Beranda</Link>} />;

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
  const [form, setForm] = useState({ categoryId: '', name: '', description: '', price: 100000, stock: 10, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/products', { params: { limit: 100 } })
    .then((response) => setProducts(response.data.products || []))
    .catch(() => setError('Gagal memuat produk.'));

  useEffect(() => {
    let active = true;
    load();
    api.get('/products/categories')
      .then((response) => {
        if (!active) return;
        const categoryList = response.data.categories || [];
        setCategories(categoryList);
        setForm((current) => ({ ...current, categoryId: categoryList[0]?.id || '' }));
      })
      .catch(() => active && setError('Gagal memuat kategori produk.'));

    return () => {
      active = false;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        categoryId: Number(form.categoryId),
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock: Number(form.stock),
        imageUrl: form.imageUrl,
        isActive: true
      };

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setEditingProductId(null);
      setForm({ ...form, name: '', description: '' });
      load();
    } catch {
      setError('Produk gagal disimpan.');
    }
  };

  const startEdit = (product) => {
    setEditingProductId(product.id);
    setForm({
      categoryId: product.category_id,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      imageUrl: product.image_url
    });
  };

  const deactivate = async (id) => {
    if (!window.confirm('Nonaktifkan produk ini?')) return;
    try {
      await api.delete(`/products/${id}`);
      load();
    } catch {
      setError('Produk gagal dinonaktifkan.');
    }
  };

  return (
    <Panel title="Kelola Produk" icon={Boxes}>
      <AdminNav />
      {error && <InlineError text={error} />}
      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-slate-100 p-5 bg-white md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Kategori</label>
          <select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Nama Produk</label>
          <input className="input" placeholder="Nama produk" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">URL Gambar</label>
          <input className="input" placeholder="URL gambar" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Harga</label>
          <input className="input" type="number" placeholder="Harga" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Stok</label>
          <input className="input" type="number" placeholder="Stok" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} required />
        </div>
        <div className="space-y-1 md:col-span-3">
          <label className="text-xs font-semibold text-slate-500 uppercase">Deskripsi</label>
          <textarea className="input" placeholder="Deskripsi produk lengkap" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        </div>
        <div className="flex gap-2 md:col-span-3">
          <button className="btn-primary flex-1">{editingProductId ? 'Simpan Perubahan Produk' : 'Tambah Produk Baru'}</button>
          {editingProductId && (
            <button type="button" className="btn-secondary" onClick={() => {
              setEditingProductId(null);
              setForm({ categoryId: categories[0]?.id || '', name: '', description: '', price: 100000, stock: 10, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' });
            }}>Batal</button>
          )}
        </div>
      </form>
      <DataTable
        columns={['ID', 'Gambar', 'Nama', 'Kategori', 'Harga', 'Stok', 'Aksi']}
        rows={products.map((product) => [
          product.id,
          <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded bg-slate-50 object-cover" />,
          <span className="font-semibold text-slate-800">{product.name}</span>,
          product.category_name,
          formatIdr(product.price),
          product.stock,
          <div className="flex gap-2">
            <button type="button" className="text-market-green font-semibold hover:underline" onClick={() => startEdit(product)}>Sunting</button>
            <button type="button" className="text-red-500 font-semibold hover:underline" onClick={() => deactivate(product.id)}>Nonaktifkan</button>
          </div>
        ])}
      />
    </Panel>
  );
}

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', slug: '', description: '' });
  const [error, setError] = useState('');
  const load = () => api.get('/admin/categories')
    .then((response) => {
      setCategories(response.data.categories || []);
      setError('');
    })
    .catch(() => setError('Gagal memuat kategori.'));
  useEffect(() => { load(); }, []);
  
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.post('/admin/categories', form);
      setForm({ name: '', slug: '', description: '' });
      load();
    } catch {
      setError('Kategori gagal disimpan.');
    }
  };
  
  const remove = async (id) => {
    if (!window.confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      load();
    } catch {
      setError('Kategori gagal dihapus.');
    }
  };

  return (
    <Panel title="Kelola Kategori" icon={Tag}>
      <AdminNav />
      {error && <InlineError text={error} />}
      <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-slate-100 p-5 bg-white md:grid-cols-3">
        <input className="input" placeholder="Nama kategori" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value, slug: event.target.value.toLowerCase().replaceAll(' ', '-') })} required />
        <input className="input" placeholder="Slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
        <input className="input" placeholder="Deskripsi" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <button className="btn-primary md:col-span-3">Tambah Kategori</button>
      </form>
      <DataTable columns={['ID', 'Nama', 'Slug', 'Deskripsi', 'Aksi']} rows={categories.map((category) => [category.id, <span className="font-semibold text-slate-800">{category.name}</span>, category.slug, category.description, <button className="text-red-500 font-semibold hover:underline" onClick={() => remove(category.id)}>Hapus</button>])} />
    </Panel>
  );
}

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = () => {
    api.get('/admin/users')
      .then((response) => setUsers(response.data.users || []))
      .catch(() => setError('Gagal memuat pengguna.'));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleUserActive = async (targetUser) => {
    try {
      await api.patch(`/admin/users/${targetUser.id}`, { role: targetUser.role, isActive: !targetUser.is_active });
      loadUsers();
    } catch {
      setError('Gagal mengubah keaktifan pengguna.');
    }
  };

  const toggleUserRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'customer' : 'admin';
    try {
      await api.patch(`/admin/users/${targetUser.id}`, { role: newRole, isActive: targetUser.is_active });
      loadUsers();
    } catch {
      setError('Gagal mengubah peran pengguna.');
    }
  };

  return (
    <Panel title="Kelola Pengguna" icon={Users}>
      <AdminNav />
      {error && <InlineError text={error} />}
      <DataTable
        columns={['ID', 'Nama', 'Email', 'Peran', 'Aktif', 'Aksi']}
        rows={users.map((item) => [
          item.id,
          <span className="font-semibold text-slate-800">{item.full_name}</span>,
          item.email,
          <span className={`pill ${item.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'pill-default'}`}>
            {item.role === 'admin' ? 'Admin' : 'Pelanggan'}
          </span>,
          <span className={`pill ${item.is_active ? 'pill-completed' : 'pill-cancelled'}`}>
            {item.is_active ? 'Aktif' : 'Nonaktif'}
          </span>,
          <div className="flex gap-2">
            <button type="button" className="text-market-green font-semibold hover:underline" onClick={() => toggleUserRole(item)}>
              Jadikan {item.role === 'admin' ? 'Pelanggan' : 'Admin'}
            </button>
            <span className="text-slate-300">|</span>
            <button type="button" className={`${item.is_active ? 'text-red-500' : 'text-emerald-600'} font-semibold hover:underline`} onClick={() => toggleUserActive(item)}>
              {item.is_active ? 'Nonaktifkan' : 'Aktifkan'}
            </button>
          </div>
        ])}
      />
    </Panel>
  );
}

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const load = () => {
    api.get('/admin/orders')
      .then((response) => setOrders(response.data.orders || []))
      .catch(() => setError('Gagal memuat pesanan.'));
  };
  useEffect(() => {
    load();
  }, []);
  return <OrdersTable title="Kelola Pesanan" orders={orders} admin error={error} onUpdate={load} />;
}

function OrdersTable({ title, orders = [], base = '', admin = false, error = '', onUpdate }) {
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/admin/orders/${orderId}`, { status: newStatus });
      if (onUpdate) onUpdate();
    } catch {
      window.alert('Gagal memperbarui status pesanan.');
    }
  };

  return (
    <Panel title={title} icon={Package}>
      {admin && <AdminNav />}
      {error && <InlineError text={error} />}
      <DataTable
        columns={admin ? ['ID', 'Pelanggan', 'Status', 'Total', 'Kota', 'Detail'] : ['ID', 'Status', 'Total', 'Kota', 'Detail']}
        rows={orders.map((order) => admin
          ? [
              order.id,
              <span className="font-semibold text-slate-800">{order.full_name || order.recipient_name}</span>,
              <select
                className="input py-1.5 px-2 text-xs w-full max-w-36 bg-slate-50 border-slate-200"
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
              >
                <option value="pending">Menunggu Pembayaran</option>
                <option value="paid">Sudah Dibayar</option>
                <option value="processing">Diproses</option>
                <option value="shipped">Dikirim</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>,
              <span className="font-bold text-slate-800">{formatIdr(order.total_amount)}</span>,
              order.city,
              <Link className="text-market-green font-semibold hover:underline" to={`/orders/${order.id}`}>Lihat</Link>
            ]
          : [
              order.id,
              <span className={`pill pill-${order.status}`}>{statusText[order.status] || order.status}</span>,
              <span className="font-bold text-slate-800">{formatIdr(order.total_amount)}</span>,
              order.city,
              <Link className="text-market-green font-semibold hover:underline" to={`${base}/${order.id}`}>Lihat</Link>
            ])}
      />
    </Panel>
  );
}

function AdminNav() {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-4">
      <Link className="btn-secondary text-xs" to="/admin"><LayoutDashboard size={14} /> Dashboard</Link>
      <Link className="btn-secondary text-xs" to="/admin/products"><Boxes size={14} /> Kelola Produk</Link>
      <Link className="btn-secondary text-xs" to="/admin/categories"><Tag size={14} /> Kelola Kategori</Link>
      <Link className="btn-secondary text-xs" to="/admin/users"><Users size={14} /> Kelola Pengguna</Link>
      <Link className="btn-secondary text-xs" to="/admin/orders"><Package size={14} /> Kelola Pesanan</Link>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="panel-card space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-800">
        {Icon && <Icon className="text-market-green" size={26} />} {title}
      </h1>
      <div>{children}</div>
    </section>
  );
}

function DataTable({ columns = [], rows = [] }) {
  return (
    <div className="table-container">
      <table className="w-full min-w-[720px] text-left text-sm border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className="table-header px-4 py-3 text-xs" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={index} className="table-row">
              {row.map((cell, cellIndex) => (
                <td className="table-cell px-4 py-3.5" key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400 font-medium">
                Tidak ada data tersedia.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="panel-card flex flex-col justify-between border-slate-100/80 bg-slate-50/10 hover:bg-slate-50/40 transition">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-800 leading-none">{value}</p>
    </div>
  );
}

function Loading() { 
  return (
    <div className="panel-card flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <Store className="animate-bounce text-market-green" size={32} />
        <p className="text-sm font-semibold text-slate-500">Memuat data KubeMarket...</p>
      </div>
    </div>
  ); 
}

// Keep single declaration of Empty
function Empty({ text }) { 
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/20 p-8 text-center text-sm font-medium text-slate-400">
      {text}
    </div>
  ); 
}

function InlineError({ text }) { 
  return (
    <div className="mb-4 rounded-lg bg-rose-50 border border-rose-100 p-4 text-sm text-rose-700 font-semibold flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
      {text}
    </div>
  ); 
}

function NotFound() { 
  return <EmptyState title="Halaman tidak ditemukan" text="Halaman yang Anda tuju tidak tersedia atau telah dipindahkan." action={<Link className="btn-primary" to="/">Kembali ke Beranda</Link>} />; 
}

function EmptyState({ title, text, action }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-soft space-y-4">
      <Store className="mx-auto text-market-green" size={48} />
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{text}</p>
      </div>
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
