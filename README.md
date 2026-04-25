# SCHALE Vault - RSA Cryptography System 🛡️✨
**Project Code Name:** *Enkripsi file RSA*

**Version:** 2.0 (Modernized Web Architecture)

---

## Daftar Isi
- [1. Pendahuluan](#1-pendahuluan)
- [2. Arsitektur Teknis](#2-arsitektur-teknis)
- [3. Spesifikasi Inti Kriptografi (Matematika RSA)](#3-spesifikasi-inti-kriptografi-matematika-rsa)
  - [A. Modular Exponentiation (modPow)](#a-modular-exponentiation-modpow)
  - [B. Kunci Privat / Modular Multiplicative Inverse (modInverse)](#b-kunci-privat--modular-multiplicative-inverse-modinverse)
  - [C. Validasi Prima (isPrime)](#c-validasi-prima-isprime)
- [4. Alur Kerja Sistem (System Workflow)](#4-alur-kerja-sistem-system-workflow-)
  - [A. Workflow Penghasilan Kunci (Key Generation Pipeline)](#a-workflow-penghasilan-kunci-key-generation-pipeline)
  - [B1. Worklfow Fase Data Type Expansion 8 -> 64](#b1-worklfow-fase-data-type-expansion-8---64)
  - [B2. Workflow Enkripsi Data (Encryption Pipeline)](#b2-workflow-enkripsi-data-encryption-pipeline)
  - [C1. Workflow Worklfow Fase Data Type Reduction 64 -> 8 (original)](#c1-workflow-worklfow-fase-data-type-reduction-64---8-original)
  - [C2. Workflow Dekripsi & Sensor Integritas (Decryption Pipeline)](#c2-workflow-dekripsi--sensor-integritas-decryption-pipeline)
- [5. Mesin Pemrosesan Data (The Processing Engine)](#5-mesin-pemrosesan-data-the-processing-engine)
  - [A. Memory Management (TypedArrays)](#a-memory-management-typedarrays)
  - [B. Asynchronous Chunking (Non-blocking UI)](#b-asynchronous-chunking-non-blocking-ui)
- [6. Sistem Integritas Data & Keamanan](#6-sistem-integritas-data--keamanan)
  - [A. Mismatch Integrity Sensor](#a-mismatch-integrity-sensor)
  - [B. Key Card Protocol (.kc)](#b-key-card-protocol-kc)
- [7. Integrasi Batch & ZIP](#7-integrasi-batch--zip)
- [8. Instruksi Penggunaan Offline Total (Air-Gapped Operation)](#8-instruksi-penggunaan-offline-total-air-gapped-operation)

---

## 1. Pendahuluan
**SCHALE Vault** adalah sistem kriptografi mandiri (*standalone*) berbasis web yang dirancang untuk melakukan enkripsi dan dekripsi file secara lokal (100% *Client-Side*). Aplikasi ini mengadaptasi estetika antarmuka dari *Blue Archive* (Arona & Plana) dan menggabungkannya dengan mesin pemrosesan data asinkron berkinerja tinggi.

Berbeda dengan implementasi RSA edukasi pada umumnya, SCHALE Vault dirancang dengan arsitektur **Batch Processing** dan **Non-blocking UI**, memungkinkannya memproses banyak file berukuran besar tanpa membuat peramban (browser) mengalami *freeze*.

---

## 2. Arsitektur Teknis

Aplikasi dibangun murni menggunakan standar web modern tanpa *framework* (Vanilla Stack) untuk memastikan ukuran file sekecil mungkin dan eksekusi secepat mungkin:
- **HTML5**: Struktur semantik dengan dukungan API File System (File Reader & Drag-and-Drop).
- **CSS3 (Modern)**: Menggunakan pendekatan *Glassmorphism*, *CSS Variables* untuk *Dynamic Theming* (Arona/Plana), dan *Shorthand properties* untuk kompresi ukuran file CSS.
- **JavaScript (ES6+)**: Menggunakan `BigInt` untuk komputasi kriptografi, `async/await` untuk operasi asinkron, dan `TypedArrays` (`Uint8Array`, `BigUint64Array`) untuk manipulasi memori mentah (*raw memory manipulation*).
- **JSZip (Library Eksternal)**: Digunakan khusus untuk mengompresi dan mengekstrak file *batch* dalam memori sebelum diunduh pengguna.

---

## 3. Spesifikasi Inti Kriptografi (Matematika RSA)

Aplikasi ini menggunakan implementasi RSA 64-bit yang direkayasa khusus untuk batas komputasi JavaScript sinkron.

### A. Modular Exponentiation (`modPow`)
Fungsi `modPow(b, e, m)` menghitung b^e mod m.
- **Algoritma**: *Right-to-Left Binary Exponentiation*.
- **Mekanisme**: Memecah pangkat e menjadi representasi biner. Alih-alih mengalikan b secara langsung (yang akan langsung menembus batas maksimal angka komputer dan menyebabkan *overflow*), algoritma ini menerapkan modulus m pada setiap tahap perkalian berulang. Ini menjaga ukuran angka tetap kecil dan komputasi tetap cepat dalam hitungan O(log e).

### B. Kunci Privat / Modular Multiplicative Inverse (`modInverse`)
Fungsi `modInverse(e, m)` bertugas mencari kunci rahasia D.
- **Algoritma**: *Extended Euclidean Algorithm*.
- **Mekanisme**: Mencari koefisien Bézout sehingga persamaan E * D ≡ 1 (mod φ(N)) terpenuhi. Ini menjamin bahwa data yang dipangkatkan dengan E (Enkripsi) hanya bisa dikembalikan jika dipangkatkan dengan D (Dekripsi).

### C. Validasi Prima (`isPrime`)
- Menggunakan *Trial Division* teroptimasi hingga akar N. Untuk arsitektur 64-bit yang digunakan aplikasi ini, kompleksitas waktu maksimal adalah sekitar O(2^32), yang dieksekusi seketika oleh mesin V8 modern.

---

## 4. Alur Kerja Sistem (System Workflow) 📊

Di bawah ini adalah pemetaan mendetail mengenai bagaimana sistem bekerja di belakang layar.

### A. Workflow Penghasilan Kunci (Key Generation Pipeline)
Saat pengguna memasukkan angka P, Q, dan E, sistem tidak langsung memprosesnya. Ada serangkaian validasi ketat sebelum kunci Modulus (N) dan Privat (D) diizinkan untuk digunakan.

```mermaid
graph TD
    Start([Mulai]) --> A[/Input: Masukkan Angka P, Q, E/]
    A --> B{Apakah P & Q <br> Prima?}
    B -- Tidak --> C[/Output Alert: Tolak Eksekusi/]
    B -- Ya --> D[Hitung Modulus N = P * Q]
    D --> E{Apakah N > 255?}
    E -- Tidak --> F[/Output Alert: N Terlalu Kecil/]
    E -- Ya --> G[Hitung Totient M = P-1 * Q-1]
    G --> H{Apakah GCD E, M == 1?}
    H -- Tidak --> I[/Output Alert: E Tidak Valid/]
    H -- Ya --> J[Kalkulasi D = modInverse E, M]
    J --> K[/Output: Sistem Terkunci & Siap Beroperasi/]
