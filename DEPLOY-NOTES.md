# AgentHall — Deploy Notes (DRAFT, belum deploy)

Status: kontrak + frontend selesai di-draft, terkompilasi, dan lulus unit test
lokal. **Belum ada deployment apa pun** — tidak ada transaksi, tidak ada kunci
yang disentuh. Dokumen ini adalah bekal untuk hari deploy.

## Toolchain & kompilasi

| Item | Nilai persis |
|---|---|
| solc | **0.8.26+commit.8a97fa7a.Emscripten.clang** (solc-js via npm `solc@0.8.26`) |
| Optimizer | enabled, **runs = 200** |
| EVM version | `paris` (aman untuk BSC) |
| Kompilasi ulang | `cd app && npm run compile` (scripts/compile.js) |
| Test | `cd app && npm test` (Ganache in-memory + ethers v6) |

Hasil kompilasi (artifacts/build-summary.json):

| Kontrak | Deployed bytecode | Estimasi gas |
|---|---|---|
| AgentHall | **2.870 byte** | solc creation estimate: tidak terhingga (immutable interface ref) → diukur riil di bawah |
| MockAgentID (test saja) | 685 byte | — |

Gas terukur riil (Ganache lokal, artifacts/gas-measurements.json):

| Aksi | gasUsed |
|---|---|
| Deploy AgentHall | **699.639** |
| register() pertama | 144.333 |
| checkIn() pertama | 118.813 |
| checkIn() hari berikutnya | ±50.726 |

Di BSC mainnet angka riil akan dekat dengan ini (selisih kecil wajar);
biaya deploy ≈ 699.639 gas × gas price saat deploy.

## Hasil unit test — 13/13 LULUS (stabil, 2 run berturut-turut)

1. ✅ Non-holder tidak bisa register (revert NotAgentHolder)
2. ✅ isAgentHolder mencerminkan balanceOf live
3. ✅ Holder bisa register; binding address→tokenId benar; event Registered; views benar
4. ✅ Register kedua kali revert (AlreadyRegistered), totalAgents tidak berubah
5. ✅ checkIn sebelum register revert (NotRegistered)
6. ✅ checkIn pertama: streak 1, counter bergerak
7. ✅ checkIn kedua di hari UTC yang sama revert (AlreadyCheckedInToday), counter tidak berubah
8. ✅ Hari berurutan: streak naik 2 → 3
9. ✅ Bolong sehari: streak reset ke 1
10. ✅ Agen kedua register + check-in; totalAgents/totalCheckInsAll/getAgents benar
11. ✅ Holder yang kehilangan Agent ID: isAgentHolder false (live), record registrasi tetap
12. ✅ Pause memblokir register + checkIn; non-owner tidak bisa pause; unpause memulihkan
13. ✅ Alamat tak dikenal: semua view nol/false

Catatan harness (jujur): Ganache `eth_estimateGas` terbukti intermiten melempar
"missing revert data" untuk call yang sebenarnya sukses (terbukti via
staticCall + raw eth_call + send bergas manual = status 1). Karena itu semua
send di test memakai `gasLimit` eksplisit 600.000 dan vonis revert/sukses
diambil dari receipt + assert state. Ini quirk toolchain lokal, bukan perilaku
kontrak; di BSC wallet user mengestimasi gas secara normal.

## Daftar file

```
app/
├── contracts/
│   ├── AgentHall.sol       — kontrak utama (self-contained, tanpa import eksternal)
│   └── MockAgentID.sol     — stub Agent ID untuk test (JANGAN deploy)
├── test/run-tests.js       — 13 unit test (Ganache + ethers v6)
├── scripts/
│   ├── compile.js          — kompilasi solc-js → artifacts/
│   └── measure-deploy-gas.js
├── artifacts/
│   ├── AgentHall.json      — ABI + bytecode + deployed size
│   ├── MockAgentID.json
│   ├── build-summary.json
│   ├── gas-measurements.json
│   └── test-results.txt
├── web/
│   ├── index.html          — satu halaman statis
│   ├── app.js              — ethers v6 via CDN; connect/register/checkIn/stats/leaderboard
│   ├── name-resolver.js    — resolveName(address) via SPACE ID Web3 Name SDK (getDomainName, chainId 56)
│   └── config.js           — alamat & ABI (agentHallAddress masih KOSONG — isi pasca-deploy)
├── package.json
└── DEPLOY-NOTES.md         — file ini
```

(Artifact `IAgentID.json` hasil kompilasi interface sengaja dihapus — interface
tidak punya bytecode dan tidak di-deploy.)

## Red-line compliance (cek mandiri)

- Kontrak **tidak memegang dana**, tidak ada fungsi transfer/withdraw/approve/
  mint/tax/blacklist; tidak payable.
- Kekuasaan owner **hanya** pause register/checkIn + transfer/renounce
  ownership — tertulis eksplisit di header NatSpec kontrak (syarat red line:
  owner permissions disclosed).
- Alamat Agent ID `immutable` — tidak bisa diganti pasca-deploy.
- Tidak ada janji imbal hasil di komentar/string/UI.
- Frontend: **tanpa** login QR/pairing Agentic Wallet, tanpa sesi server;
  semua transaksi ditandatangani wallet user sendiri (window.ethereum).
- Nama proyek "AgentHall" tidak memakai kata Binance/BNB.

## Langkah berikutnya (hari deploy — BELUM dilakukan)

1. **Deploy** AgentHall ke BSC mainnet dari wallet deployer (konstruktor:
   `0x60b9262456de011f7d15a54cdd8c48baaa8b022f`). Perkiraan biaya ±699.639 gas.
   Catat alamat + tx hash.
2. **Verifikasi BscScan**: submit source `contracts/AgentHall.sol` (single
   file, tanpa import) dengan compiler v0.8.26, optimizer enabled 200 runs,
   evm paris, constructor arg = alamat Agent ID di atas; pastikan status
   "Verified" + open-source terbaca publik.
3. **Isi `web/config.js`**: `agentHallAddress` = alamat deploy; salin ABI dari
   `artifacts/AgentHall.json` bila perlu. Hosting statis di mana saja
   (GitHub Pages/dll).
4. **Uji live murah**: 1 wallet pemegang Agent ID → register + checkIn,
   pastikan event + leaderboard tampil dan nama .ai ter-resolve.
5. **Submit hackathon** (field dari pengumuman; portal submit belum
   dipublikasikan per RECON.md — pantau @BinanceWallet/@BNBChain):
   nama proyek "AgentHall", website (URL hosting langkah 3), alamat kontrak
   hasil langkah 1, deskripsi pemakaian Agent ID (gate balanceOf +
   binding tokenOfOwnerByIndex + check-in harian khusus holder), alamat
   penerima hadiah.
6. **Target kelayakan Innovation Award**: minimal 30 alamat Agent ID
   berinteraksi selama Submission Period (s.d. 9 Des 2026 15:00 WIB) —
   dorong registrasi + check-in dari komunitas pemegang .ai.

## TODO teknis yang diketahui

- `web/index.html`: entri CDN SPACE ID SDK (`@web3-name-sdk/core`) perlu
  diverifikasi ulang ke docs.space.id saat deploy + pin versi/SRI; UI sudah
  degrade gracefully (tampil alamat pendek) bila SDK gagal dimuat.
- Leaderboard web saat ini menampilkan 10 registrasi terakhir + streak
  masing-masing (dibaca via getAgents + getAgent) — cukup untuk v1; ranking
  streak global penuh butuh indexer event bila jumlah agen besar.
