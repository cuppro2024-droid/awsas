import type { Pose } from './types';

export const POSES: Pose[] = [
  { label: 'Joyful', prompt: 'A photo of the person, now looking joyful and celebrating a victory.' },
  { label: 'Winking', prompt: 'A photo of the person, now winking at the camera with a thumbs up.' },
  { label: 'Presenting', prompt: 'A photo of the person, now presenting something to their side with open palms.' },
  { label: 'Surprised', prompt: 'A photo of the person, now looking very surprised with hands on their cheeks.' },
  { label: 'Sad', prompt: 'A photo of the person, now looking sad with their hand on their forehead.' },
  { label: 'Angry', prompt: 'A photo of the person, now looking angry with their arms crossed.' },
  { label: 'Thoughtful', prompt: 'A photo of the person, now in a thoughtful pose with a hand on their chin.' },
  { label: 'Double Point', prompt: 'A photo of the person, now smiling and pointing to the side with both hands.' },
  { label: 'Shushing', prompt: 'A photo of the person, now making a shushing gesture with a finger to their lips.' },
];

export const BACKGROUND_OPTIONS: string[] = [
  'Putih Polos',
  'Studio Foto (Abu-abu)',
  'Kantor Modern',
  'Cafe yang Nyaman',
  'Taman Kota (Siang Hari)',
  'Pantai Tropis',
  'Perpustakaan Klasik',
  'Dapur Minimalis',
  'Latar Belakang Bokeh Berwarna-warni',
  'Dinding Bata Industrial',
  'Pemandangan Gunung',
  'Interior Futuristik',
];

export const CUSTOM_OPTION_VALUE = "Lainnya... (Ketik sendiri)";

export const MOCKUP_TEMPLATES: string[] = [
    'Kaos',
    'Hoodie',
    'Tote Bag',
    'Mug Kopi',
    'Botol Air',
    'Poster di Dinding',
    'Kemasan Kotak',
    'Topi Baseball',
    'Casing Telepon',
    'Buku Catatan',
    'Kaleng Minuman',
    'Kantong Kopi',
    'Layar Laptop',
    'Bantal Sofa',
    'Tas Belanja Kertas',
    'Sampul Buku',
];

export const SCENE_PRESETS: string[] = [
    'Studio Putih Bersih',
    'Latar Belakang Gradien Premium',
    'Meja Kayu Pedesaan',
    'Gaya Hidup Kafe',
    'Datar Minimalis',
    'Dipegang oleh Model',
    'Latar Belakang Perkotaan',
    'Pemandangan Alam',
    'Permukaan Marmer Mewah',
    'Latar Belakang Beton Industrial',
    'Panggung Produk dengan Lampu Sorot',
    'Latar Belakang Transparan',
];

export const PLACEMENT_OPTIONS: string[] = [
    'Di Tengah Permukaan',
    'Label Depan',
    'Sudut Kanan Atas',
    'Sudut Kiri Bawah',
    'Melengkung di Sekitar Objek',
    'Pola Berulang (Seamless)',
    'Bagian Belakang Produk',
    'Tutup atau Bagian Atas',
];

export const DESIGN_SIZE_OPTIONS: string[] = [
    'Kecil (Ikon/Logo)',
    'Sedang (Grafis Utama)',
    'Besar (Menutupi Sebagian Besar)',
    'Sangat Besar (Cetak Seluruh Permukaan)',
];

export const LIGHTING_OPTIONS: string[] = [
    'Pencahayaan Studio Cerah',
    'Cahaya Alami (Luar Ruangan)',
    'Dramatis (Bayangan Kuat)',
    'Cahaya Lembut dan Tersebar',
    'Neon / Cyberpunk',
    'Cahaya Tepi (Rim Light)',
    'Cahaya Atas (Top-down)',
    'Golden Hour (Matahari Terbenam)',
];
