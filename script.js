/**
 * SCHALE RSA TOOL - COMPACT LOGIC (BATCH SUPPORT + INTEGRITY CHECK)
 */

// RSA MATH & VALIDATION
const isPrime = (n) => {
    if (n < 2n) return false;
    for (let i = 2n; i * i <= n; i++) if (n % i === 0n) return false;
    return true;
};
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
        ['page-', 'nav-btn-', 'bg-'].forEach(pre => {
            const el = document.getElementById(pre + p);
            if (el) el.classList.toggle('active', p === target);
        });
    });
    const b = document.getElementById('nav-btn-' + target), i = document.getElementById('nav-indicator');
    if (b && i) { i.style.left = b.offsetLeft + "px"; i.style.width = b.offsetWidth + "px"; }
};

const toggleView = (id) => {
    const el = document.getElementById(id);
    el.type = el.type === "password" ? "text" : "password";
    el.nextElementSibling.innerText = el.type === "password" ? "👁️" : "🕶️";
};

// FILE HANDLING
let filesToEnc = [], filesToDec = [], originalName = "", currentZipId = "";

const regFile = (inputFiles, mode) => {
    const files = Array.from(inputFiles); if (!files.length) return;
    if (mode === 'ar') {
        filesToEnc = files;
        document.getElementById('txt-ar').innerText = files.length > 1 ? `${files.length} File Terpilih` : files[0].name;
    } else if (mode === 'cip') {
        if (files[0].name.endsWith('.zip')) return processZip(files[0]);
        filesToDec = files; currentZipId = "MANUAL";
        document.getElementById('txt-cip').innerText = files[0].name; checkReady();
    } else if (mode === 'tk') {
        const r = new FileReader(); r.onload = () => parseKC(r.result, files[0].name); r.readAsText(files[0]);
    }
};

const parseKC = (txt, fn) => {
    const mN = txt.match(/MODULUS \(N\):\s*(\d+)/), mD = txt.match(/PRIVATE KEY \(D\):\s*(\d+)/), mO = txt.match(/ORIGINAL NAME:\s*(.*)/);
    if (mN && mD) {
        document.getElementById('pn_val').value = mN[1];
        document.getElementById('pd_val').value = mD[1];
        originalName = mO ? mO[1].trim() : "";
        document.getElementById('txt-tk').innerText = fn; checkReady();
    } else alert("Arona: Kartu Kunci tidak valid!");
};

const processZip = async (file) => {
    try {
        const zip = await JSZip.loadAsync(file);
        filesToDec = []; let kcFile = null;
        const m = file.name.match(/ENCRYPTED_(.*)\.zip/); currentZipId = m ? m[1] : "UNKNOWN";
        for (let fn in zip.files) {
            if (fn.endsWith('.enc')) filesToDec.push(new File([await zip.files[fn].async("blob")], fn));
            if (fn.endsWith('.kc')) kcFile = zip.files[fn];
        }
        if (filesToDec.length && kcFile) {
            parseKC(await kcFile.async("string"), "Key Card");
            document.getElementById('txt-cip').innerText = filesToDec.length + " File (ZIP)";
        } else alert("Arona: ZIP tidak lengkap!");
    } catch (e) { alert("Arona: ZIP Error!"); }
};

const checkReady = () => {
    const b = document.getElementById('btn-pl-exec');
    b.disabled = !(filesToDec.length && document.getElementById('pn_val').value && /^\d+$/.test(document.getElementById('pd_val').value));
};

const calcKeys = () => {
    const [p, q, e] = ["p_val", "q_val", "e_val"].map(id => BigInt(document.getElementById(id).value.replace(/\D/g,'') || 0));
    if (!p || !q || !e) return alert("P, Q, E harus angka!");
    if (!isPrime(p) || !isPrime(q)) return alert("Arona: P dan Q harus angka PRIMA!");
    if (p * q < 256n) return alert("Arona: N harus > 255!");
    const m = (p - 1n) * (q - 1n);
    if (gcd(e, m) !== 1n) return alert("E tidak valid!");
    document.getElementById('n_val').value = (p * q).toString();
    document.getElementById('d_val').value = modInverse(e, m).toString();
};

const processFile = async (isEnc) => {
    const n = document.getElementById(isEnc ? 'n_val' : 'pn_val').value, k = document.getElementById(isEnc ? 'e_val' : 'pd_val').value;
    const files = isEnc ? filesToEnc : filesToDec;
    if (isEnc && !/^\d+$/.test(document.getElementById('d_val').value)) return alert("D belum ada!");
    if (!files.length || !/^\d+$/.test(n) || !/^\d+$/.test(k)) return alert("Data/Kunci Error!");

    const id = isEnc ? 'ar' : 'pl', prog = document.getElementById('prog-' + id), fill = document.getElementById('fill-' + id);
    prog.style.display = "block"; const [bN, bK] = [BigInt(n), BigInt(k)];
    const outZip = new JSZip(), rid = isEnc ? Math.random().toString(36).substr(2, 8).toUpperCase() : currentZipId;

    for (let i = 0; i < files.length; i++) {
        const f = files[i], buf = new Uint8Array(await f.arrayBuffer()), total = isEnc ? buf.length : new BigUint64Array(buf.buffer).length;
        const view = isEnc ? buf : new BigUint64Array(buf.buffer), out = isEnc ? new BigUint64Array(total) : new Uint8Array(total);
        const chunkSize = 100000; let lastP = performance.now();
        for (let x = 0; x < total; x += chunkSize) {
            for (let j = x; j < Math.min(x + chunkSize, total); j++) {
                const dec = modPow(view[j], bK, bN);
                if (!isEnc && dec > 255n) {
                    prog.style.display = "none"; fill.style.width = "0%";
                    return alert("Arona: Kunci Mismatch! Berkas tidak cocok dengan kunci ini (Modulus atau Privat D salah).");
                }
                out[j] = isEnc ? dec : Number(dec);
            }
            fill.style.width = (((i + (x / total)) / files.length) * 100) + "%";
            if (performance.now() - lastP > 30) { await new Promise(r => setTimeout(r, 0)); lastP = performance.now(); }
        }
        if (isEnc) outZip.file(f.name + ".enc", out.buffer);
        else outZip.file((files.length === 1 && originalName) ? originalName : f.name.replace(".enc", ""), out.buffer);
    }
    if (isEnc) {
        outZip.file("KEY_CARD.kc", `MODULUS (N): ${n}\nPRIVATE KEY (D): ${document.getElementById('d_val').value}`);
        saveAs(await outZip.generateAsync({ type: "blob" }), `ENCRYPTED_${rid}.zip`);
    } else saveAs(await outZip.generateAsync({ type: "blob" }), `DECRYPTED_${rid}.zip`);
    prog.style.display = "none"; fill.style.width = "0%"; alert("Selesai!");
};

const saveAs = (blob, fn) => {
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = fn; a.click(); setTimeout(() => URL.revokeObjectURL(u), 60000);
};

// BRIDGES & PARALLAX
const handleSelect = (i, m) => regFile(i.files, m);
const handleDrop = (e, m) => { e.preventDefault(); regFile(e.dataTransfer.files, m); };
const handleZipSelect = (i) => processZip(i.files[0]);
const handleZipDrop = (e) => { e.preventDefault(); processZip(e.dataTransfer.files[0]); };
window.addEventListener('load', () => {
    switchPage('arona'); document.querySelectorAll('input').forEach(i => {
        i.value = ""; if(i.type === "number") i.addEventListener('wheel', (e) => {
            e.preventDefault(); i.value = Math.max(0, parseInt(i.value || 0) + (e.deltaY < 0 ? 1 : -1));
        });
    });
    ['txt-ar', 'txt-cip', 'txt-tk'].forEach(id => { if (document.getElementById(id)) document.getElementById(id).innerText = "Klik atau Seret Berkas Di Sini"; });
    if (window.innerWidth < 768) document.querySelectorAll('.mascot-bg').forEach(bg => bg.style.height = window.innerHeight + "px");
});
window.addEventListener('scroll', () => {
    const s = window.scrollY; document.querySelectorAll('.mascot-bg').forEach(bg => bg.style.backgroundPositionY = `${(s * 0.1)}px`);
});
