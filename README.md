# Sistem Pakar Penyakit Padi

Sistem pakar berbasis web untuk mendiagnosa penyakit pada tanaman padi menggunakan metode forward chaining dan certainty factor.

## App

https://uts-sistem-pakar.vercel.app/

## Fitur

- **Inference Engine** dengan forward chaining dan certainty factor (MYCIN-like)
- **Interface Modern** dengan Next.js dan React
- **Session Management** untuk input gejala bertahap
- **Responsive Design** untuk mobile dan desktop
- **Ready to Deploy** ke Vercel

## Teknologi

- **Next.js 14** - React framework
- **TypeScript** - Type-safe development
- **CSS3** - Modern styling
- **Forward Chaining** - Metode inferensi
- **Certainty Factor** - Penanganan ketidakpastian

## Struktur Project

```
.
├── lib/
│   ├── inference-engine.ts  # Engine inferensi forward chaining + CF
│   └── rules.ts             # Data rules dan facts
├── pages/
│   ├── _app.tsx            # App wrapper
│   └── index.tsx           # Halaman utama
├── styles/
│   └── globals.css         # Global styles
├── public/                 # Static assets
├── package.json            # Dependencies
├── next.config.js          # Next.js config
├── tsconfig.json           # TypeScript config
└── vercel.json             # Vercel config

# File lama (tidak digunakan di Next.js):
├── inference_engine/       # [Legacy]
├── ui/                     # [Legacy]
└── rules.json              # [Legacy - sudah dikonversi ke rules.ts]
```

## Cara Penggunaan

1. **Pilih Gejala**: Geser slider untuk setiap pertanyaan gejala
   - Tidak (0%)
   - Ragu (50%)
   - Ya (100%)

2. **Navigasi Sesi**: Gunakan tombol pagination atau pills untuk berpindah antar halaman

3. **Proses Diagnosa**: Setelah mengisi semua sesi, klik "Proses Diagnosa"

4. **Lihat Hasil**: Sistem akan menampilkan penyakit yang terdeteksi beserta tingkat kepercayaan (CF)

## Metode Inferensi

### Forward Chaining
Sistem menggunakan forward chaining untuk inferensi dari fakta (gejala) menuju kesimpulan (penyakit).

### Certainty Factor (CF)
- **CF Paralel**: MIN dari CF antecedent (operasi AND)
- **CF Sequential**: CF_paralel × CF_rule
- **CF Kombinasi**: Menggunakan formula MYCIN untuk menggabungkan CF dari rules yang sama

## Scripts

```bash
npm run dev      # Development server (localhost:3000)
npm run build    # Build untuk production
npm run start    # Jalankan production build
npm run lint     # Check code quality
```

## Environment Variables

Tidak ada environment variable yang diperlukan untuk project ini.

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT License

## Author

**Zaidan Ahmad** - [GitHub](https://github.com/FactSwift)
**Adzka Dzikri Imanullah** - [GitHub](https://github.com/Adzkadzikri)

## Kontribusi
Pull requests are welcome!
