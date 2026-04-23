/**
 * SCHALE RSA TOOL - COMPACT LOGIC
 */

// RSA MATH UTILITIES
const gcd = (a, b) => b === 0n ? a : gcd(b, a % b);
const modPow = (b, e, m) => {
    let res = 1n; b = BigInt(b) % BigInt(m); e = BigInt(e); m = BigInt(m);
    while (e > 0n) { if (e % 2n === 1n) res = (res * b) % m; e /= 2n; b = (b * b) % m; }
    return res;
};
const modInverse = (e, m) => {
    let [t0, t1, r0, r1] = [0n, 1n, BigInt(m), BigInt(e)];
    while (r1 !== 0n) { let q = r0 / r1; [t0, t1] = [t1, t0 - q * t1]; [r0, r1] = [r1, r0 - q * r1]; }
    return t0 < 0n ? t0 + BigInt(m) : t0;
};

// UI & NAVIGATION
const switchPage = (target) => {
    document.body.className = "theme-" + target;
    ['arona', 'plana'].forEach(p => {
        const isActive = p === target;
        ['page-', 'nav-btn-', 'bg-'].forEach(prefix => {
            const el = document.getElementById(prefix + p);
            if (el) el.classList.toggle('active', isActive);
        });
    });
    const btn = document.getElementById('nav-btn-' + target), ind = document.getElementById('nav-indicator');
    if (btn && ind) { ind.style.left = btn.offsetLeft + "px"; ind.style.width = btn.offsetWidth + "px"; }
};

const toggleView = (id) => {
    const el = document.getElementById(id), btn = el.nextElementSibling;
    el.type = el.type === "password" ? "text" : "password";
    btn.innerText = el.type === "password" ? "👁️" : "🕶️";
};

// FILE HANDLING
let [fileToEnc, fileToDec, originalName] = [null, null, ""];

const regFile = (file, mode) => {
    if (!file) return;
    if (mode === 'ar') { fileToEnc = file; document.getElementById('txt-ar').innerText = file.name; }
    else if (mode === 'cip') { fileToDec = file; document.getElementById('txt-cip').innerText = file.name; checkReady(); }
    else if (mode === 'tk') { 
        const reader = new FileReader(); 
        reader.onload = () => parseKC(reader.result, file.name); 
        reader.readAsText(file); 
    }
};

const parseKC = (txt, fn) => {
    const mN = txt.match(/MODULUS \(N\):\s*(\d+)/), mD = txt.match(/PRIVATE KEY \(D\):\s*(\d+)/), mNm = txt.match(/ORIGINAL NAME:\s*(.*)/);
    if (mN && mD) {
        document.getElementById('pn_val').value = mN[1];
        document.getElementById('pd_val').value = mD[1];
        originalName = mNm ? mNm[1].trim() : "";
        document.getElementById('txt-tk').innerText = fn;
        checkReady();
    }
};

const processZip = async (file) => {
    try {
        const zip = await JSZip.loadAsync(file);
        let [enc, kc] = [null, null];
        for (let fn in zip.files) {
            if (fn.endsWith('.enc')) enc = zip.files[fn];
            if (fn.endsWith('.kc')) kc = zip.files[fn];
        }
        if (enc && kc) {
            fileToDec = new File([await enc.async("blob")], enc.name);
            parseKC(await kc.async("string"), kc.name + " (ZIP)");
            document.getElementById('txt-cip').innerText = enc.name + " (ZIP)";
        }
    } catch (e) { alert("Arona: ZIP Error!"); }
};

const checkReady = () => {
    const btn = document.getElementById('btn-pl-exec');
    btn.disabled = !(fileToDec && document.getElementById('pn_val').value && document.getElementById('pd_val').value);
};

// CORE ACTIONS
const calcKeys = () => {
    const [p, q, e] = ["p_val", "q_val", "e_val"].map(id => BigInt(document.getElementById(id).value || 0));
    if (!p || !q || !e) return alert("Isi P, Q, E!");
    const m = (p - 1n) * (q - 1n);
    if (gcd(e, m) !== 1n) return alert("E tidak valid! Tips: Gunakan angka prima (3, 17, 65537)");
    document.getElementById('n_val').value = (p * q).toString();
    document.getElementById('d_val').value = modInverse(e, m).toString();
};

const processFile = (isEnc) => {
    const file = isEnc ? fileToEnc : fileToDec;
    const [n, k] = [isEnc ? 'n_val' : 'pn_val', isEnc ? 'e_val' : 'pd_val'].map(id => BigInt(document.getElementById(id).value || 0));
    if (!file || !n || !k) return alert("File/Kunci belum siap!");

    const reader = new FileReader();
    reader.onload = async () => {
        const buf = new Uint8Array(reader.result), id = isEnc ? 'ar' : 'pl';
        const prog = document.getElementById('prog-' + id), fill = document.getElementById('fill-' + id);
        prog.style.display = "block";

        let out;
        if (isEnc) {
            out = new BigUint64Array(buf.length);
            buf.forEach((v, i) => { out[i] = modPow(v, k, n); if (i % 100 === 0) fill.style.width = (i / buf.length * 100) + "%"; });
        } else {
            const view = new BigUint64Array(buf.buffer);
            out = new Uint8Array(view.length);
            view.forEach((v, i) => { out[i] = Number(modPow(v, k, n)); if (i % 100 === 0) fill.style.width = (i / view.length * 100) + "%"; });
        }

        if (isEnc) {
            const zip = new JSZip(), rid = Math.random().toString(36).substr(2, 8).toUpperCase();
            zip.file(`DATA_${rid}.enc`, out.buffer);
            zip.file("KEY_CARD.kc", `ORIGINAL NAME: ${file.name}\nMODULUS (N): ${n}\nPRIVATE KEY (D): ${document.getElementById('d_val').value}`);
            saveAs(await zip.generateAsync({ type: "blob" }), `ENCRYPTED_${rid}.zip`);
        } else {
            saveAs(new Blob([out]), originalName || "recovered.bin");
        }
        prog.style.display = "none"; alert("Selesai!");
    };
    reader.readAsArrayBuffer(file);
};

const saveAs = (blob, fn) => {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = fn; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
};

// BRIDGES (HTML to JS)
const handleSelect = (input, mode) => regFile(input.files[0], mode);
const handleDrop = (e, mode) => regFile(e.dataTransfer.files[0], mode);
const handleZipSelect = (input) => processZip(input.files[0]);
const handleZipDrop = (e) => processZip(e.dataTransfer.files[0]);

// INITIALIZATION
window.addEventListener('load', () => {
    switchPage('arona');
    
    // Only lock height on mobile screens (to handle keyboard issues)
    if (window.innerWidth < 768) {
        const h = window.innerHeight;
        document.querySelectorAll('.mascot-bg').forEach(bg => {
            bg.style.height = h + "px";
        });
    }
});
