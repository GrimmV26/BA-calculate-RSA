// --- RSA CORE ---
function gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    while (b !== 0n) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

function modInverse(e, m) {
    e = BigInt(e);
    m = BigInt(m);

    let t0 = 0n;
    let t1 = 1n;
    let r0 = m;
    let r1 = e;

    while (r1 !== 0n) {
        let q = r0 / r1;
        let t = t0 - q * t1;
        t0 = t1;
        t1 = t;
        let r = r0 - q * r1;
        r0 = r1;
        r1 = r;
    }

    if (t0 < 0n) {
        return t0 + m;
    } else {
        return t0;
    }
}

function modPow(b, e, m) {
    let res = 1n;
    b = BigInt(b) % BigInt(m);
    e = BigInt(e);
    m = BigInt(m);

    while (e > 0n) {
        if (e % 2n === 1n) {
            res = (res * b) % m;
        }
        e = e / 2n;
        b = (b * b) % m;
    }
    return res;
}

// --- UI & NAVIGATION ---
function switchPage(target) {
    document.body.className = "theme-" + target;

    const pages = ['arona', 'plana'];
    pages.forEach(p => {
        const pageEl = document.getElementById('page-' + p);
        const btnEl = document.getElementById('nav-btn-' + p);
        const imgEl = document.getElementById('img-' + p);

        if (pageEl) pageEl.classList.toggle('active', p === target);
        if (btnEl) btnEl.classList.toggle('active', p === target);
        if (imgEl) imgEl.classList.toggle('active', p === target);
    });

    // Move Indicator
    const btn = document.getElementById('nav-btn-' + target);
    const indicator = document.getElementById('nav-indicator');

    if (btn && indicator) {
        indicator.style.left = btn.offsetLeft + "px";
        indicator.style.width = btn.offsetWidth + "px";
    }
}

// Sinkronisasi Navigasi & Lock Viewport saat Start
window.addEventListener('load', () => {
    switchPage('arona');
    
    // Lock mascot position for mobile keyboard
    const layer = document.getElementById('mascot-layer');
    if (layer) {
        layer.style.height = window.innerHeight + "px";
    }
});

function toggleView(id) {
    const input = document.getElementById(id);
    const btn = input.nextElementSibling;
    if (input) {
        if (input.type === "password") {
            input.type = "text";
            btn.innerText = "🕶️";
        } else {
            input.type = "password";
            btn.innerText = "👁️";
        }
    }
}

// --- LOGIC ---
let fileToEnc = null;
let fileToDec = null;
let originalNameFromKey = ""; 

function handleSelect(input, mode) {
    if (input.files.length > 0) {
        registerFile(input.files[0], mode);
    }
}

function handleDrop(e, mode) {
    if (e.dataTransfer.files.length > 0) {
        registerFile(e.dataTransfer.files[0], mode);
    }
}

// --- ZIP LOGIC ---
function handleZipSelect(input) {
    if (input.files.length > 0) {
        processZip(input.files[0]);
    }
}

function handleZipDrop(e) {
    if (e.dataTransfer.files.length > 0) {
        processZip(e.dataTransfer.files[0]);
    }
}

async function processZip(file) {
    try {
        const zip = await JSZip.loadAsync(file);
        const zipNameEl = document.getElementById('txt-zip');
        if (zipNameEl) zipNameEl.innerText = "Processing: " + file.name;

        let encFile = null;
        let kcFile = null;

        for (let filename in zip.files) {
            if (filename.endsWith('.enc')) {
                encFile = zip.files[filename];
            }
            if (filename.endsWith('.kc')) {
                kcFile = zip.files[filename];
            }
        }

        if (encFile && kcFile) {
            // Load .enc as Blob
            const encBlob = await encFile.async("blob");
            fileToDec = new File([encBlob], encFile.name);
            document.getElementById('txt-cip').innerText = encFile.name + " (From ZIP)";

            // Load .kc as Text
            const kcText = await kcFile.async("string");
            parseKC(kcText, kcFile.name);

            if (zipNameEl) zipNameEl.innerText = "ZIP Loaded Successfully!";
            checkPlanaReady();
        } else {
            alert("Arona: File ZIP tidak lengkap! Pastikan ada file .enc dan kartu kunci .kc di dalamnya.");
        }
    } catch (e) {
        alert("Arona: Gagal memproses ZIP. Pastikan file tidak korup.");
    }
}

function registerFile(file, mode) {
    if (!file) return;

    if (mode === 'ar') {
        fileToEnc = file;
        document.getElementById('txt-ar').innerText = file.name;
    } else if (mode === 'cip') {
        fileToDec = file;
        document.getElementById('txt-cip').innerText = file.name;
        checkPlanaReady();
    } else if (mode === 'tk') {
        const reader = new FileReader();
        reader.onload = () => {
            parseKC(reader.result, file.name);
        };
        reader.readAsText(file);
    }
}

function parseKC(txt, filename) {
    const mN = txt.match(/MODULUS \(N\):\s*(\d+)/);
    const mD = txt.match(/PRIVATE KEY \(D\):\s*(\d+)/);
    const mName = txt.match(/ORIGINAL NAME:\s*(.*)/);

    if (mN && mD) {
        document.getElementById('pn_val').value = mN[1];
        document.getElementById('pd_val').value = mD[1];
        
        if (mName) {
            originalNameFromKey = mName[1].trim();
        }

        const tkLabel = document.getElementById('txt-tk');
        if (tkLabel) {
            tkLabel.innerText = filename + (filename.includes("ZIP") ? "" : " (Parsed)");
        }
        checkPlanaReady();
    } else {
        alert("Arona: Format Kartu Kunci tidak dikenali!");
    }
}

function checkPlanaReady() {
    const btn = document.getElementById('btn-pl-exec');
    const hasFile = fileToDec !== null;
    const hasN = document.getElementById('pn_val').value !== "";
    const hasD = document.getElementById('pd_val').value !== "";

    if (hasFile && hasN && hasD && btn) {
        btn.disabled = false;
        btn.style.boxShadow = "0 0 20px rgba(255,255,255,0.4)";
    }
}

function calcKeys() {
    try {
        const pInput = document.getElementById('p_val').value;
        const qInput = document.getElementById('q_val').value;
        const eInput = document.getElementById('e_val').value;

        if (!pInput || !qInput || !eInput) {
            alert("Arona: Tolong isi P, Q, dan E terlebih dahulu!");
            return;
        }

        let p = BigInt(pInput);
        let q = BigInt(qInput);
        let e = BigInt(eInput);
        
        let n = p * q;
        let m = (p - 1n) * (q - 1n);

        if (gcd(e, m) !== 1n) {
            alert("Arona: Kunci Publik (E) tidak valid!\n\nTips :\n1. Gunakan angka prima ganjil.\n2. Coba angka standar: 3, 17, atau 65537.\n3. Pastikan E < (P-1)*(Q-1).");
            return;
        }

        document.getElementById('n_val').value = n.toString();
        document.getElementById('d_val').value = modInverse(e, m).toString();
        
        alert("Arona: Kunci Vault Berhasil Dibuat!");
    } catch (err) {
        alert("Arona: Terjadi kesalahan input!");
    }
}

async function processFile(isEnc) {
    const file = isEnc ? fileToEnc : fileToDec;
    
    if (!file) {
        alert("Pilih file terlebih dahulu!");
        return;
    }

    const nVal = document.getElementById(isEnc ? 'n_val' : 'pn_val').value;
    const kVal = document.getElementById(isEnc ? 'e_val' : 'pd_val').value;

    if (!nVal || !kVal) {
        alert("Kunci belum siap!");
        return;
    }

    const n = BigInt(nVal);
    const k = BigInt(kVal);
    const id = isEnc ? 'ar' : 'pl';

    const reader = new FileReader();
    reader.onload = async () => {
        const buffer = new Uint8Array(reader.result);
        const progContainer = document.getElementById('prog-' + id);
        const fillBar = document.getElementById('fill-' + id);
        
        if (progContainer) {
            progContainer.style.display = "block";
        }

        let out;
        if (isEnc) {
            out = new BigUint64Array(buffer.length);
            for (let i = 0; i < buffer.length; i++) {
                out[i] = modPow(buffer[i], k, n);
                if (i % 100 === 0 && fillBar) {
                    fillBar.style.width = (i / buffer.length * 100) + "%";
                }
            }
        } else {
            const view = new BigUint64Array(buffer.buffer);
            out = new Uint8Array(view.length);
            for (let i = 0; i < view.length; i++) {
                out[i] = Number(modPow(view[i], k, n));
                if (i % 50 === 0 && fillBar) {
                    fillBar.style.width = (i / view.length * 100) + "%";
                }
            }
        }

        if (isEnc) {
            const randomID = Math.random().toString(36).substring(2, 10).toUpperCase();
            const zip = new JSZip();

            // Tambahkan file terenkripsi
            zip.file("SCHALE_ENCRYPTED_" + randomID + ".enc", out.buffer);

            // Tambahkan Key Card (.kc)
            const dVal = document.getElementById('d_val').value;
            const kcContent = `SCHALE SECURITY KEY CARD\nORIGINAL NAME: ${file.name}\nMODULUS (N): ${nVal}\nPUBLIC KEY (E): ${kVal}\nPRIVATE KEY (D): ${dVal}`;
            zip.file("Key_Card_" + file.name.split('.')[0] + ".kc", kcContent);

            // Generate ZIP
            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "ENCRYPTED_" + randomID + ".zip";
            a.click();
            
            // Bersihkan memori dalam 1 menit
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);
        } else {
            const blob = new Blob([out.buffer]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalNameFromKey || "recovered_file.bin";
            a.click();
            
            // Bersihkan memori dalam 1 menit
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);
        }

        if (progContainer) {
            progContainer.style.display = "none";
        }
        alert("Protokol Selesai!");
    };
    reader.readAsArrayBuffer(file);
}
