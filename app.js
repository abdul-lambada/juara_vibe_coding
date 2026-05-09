const API_KEY = 'AIzaSyD_Z5YhkKoq45qF0JccPYNFJyAxznMG8RI';
const MODEL = 'gemini-1.5-flash';

// --- UI Navigation ---
function switchTab(tab) {
    document.querySelectorAll('.tab-content, [id^="tab-"]').forEach(el => {
        if(el.id && el.id.startsWith('tab-')) el.classList.add('hidden');
    });
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    const btnS = document.getElementById('btn-subnet');
    const btnI = document.getElementById('btn-iot');
    
    if(tab === 'subnet') {
        btnS.className = 'tab-active px-8 py-3 rounded-xl text-sm font-bold transition-all';
        btnI.className = 'px-8 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white';
    } else {
        btnI.className = 'tab-active px-8 py-3 rounded-xl text-sm font-bold transition-all';
        btnS.className = 'px-8 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white';
    }
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('animate-fadeIn');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Robust Subnetting Logic (QA Approved) ---
function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long) {
    return [
        (long >>> 24) & 0xFF,
        (long >>> 16) & 0xFF,
        (long >>> 8) & 0xFF,
        long & 0xFF
    ].join('.');
}

function calculateSubnet() {
    const ip = document.getElementById('ipInput').value.trim();
    const cidr = parseInt(document.getElementById('cidrInput').value);

    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) {
        showToast('❌ Masukkan IP & CIDR (0-32) yang valid!');
        return;
    }

    try {
        const ipLong = ipToLong(ip);
        const maskLong = (0xFFFFFFFF << (32 - cidr)) >>> 0;
        const netLong = (ipLong & maskLong) >>> 0;
        const broadLong = (netLong | ~maskLong) >>> 0;

        document.getElementById('subnetEmpty').classList.add('hidden');
        document.getElementById('subnetResult').classList.remove('hidden');
        
        document.getElementById('resNetwork').textContent = longToIp(netLong);
        document.getElementById('resMask').textContent = longToIp(maskLong);
        document.getElementById('resBroadcast').textContent = longToIp(broadLong);
        
        // Usable range logic
        if (cidr === 32) {
            document.getElementById('resRange').textContent = longToIp(netLong);
        } else if (cidr === 31) {
            document.getElementById('resRange').textContent = `${longToIp(netLong)} - ${longToIp(broadLong)}`;
        } else {
            document.getElementById('resRange').textContent = `${longToIp(netLong + 1)} - ${longToIp(broadLong - 1)}`;
        }

        const visual = document.getElementById('subnetVisual');
        visual.innerHTML = '';
        for (let i = 0; i < 32; i++) {
            const bit = document.createElement('div');
            bit.className = `w-2 h-4 rounded-full transition-all duration-500 ${i < cidr ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]' : 'bg-slate-800'}`;
            visual.appendChild(bit);
        }
        showToast('✅ Kalkulasi Presisi Selesai!');
    } catch (e) {
        showToast('❌ Format IP salah!');
    }
}

// --- IoT Generator ---
function generateIoTCode() {
    const board = document.getElementById('boardSelect').value;
    const sensor = document.getElementById('sensorSelect').value;
    const pin = document.getElementById('pinInput').value || (sensor === 'ultrasonic' ? '4,5' : '4');
    
    let code = `// AUTO-GENERATED FOR ${board.toUpperCase()}\n// AetherVibe Lab Smart Generator\n\n`;
    let wiring = [];

    if (sensor === 'dht22') {
        code += `#include "DHT.h"\n#define DHTPIN ${pin}\n#define DHTTYPE DHT22\nDHT dht(DHTPIN, DHTTYPE);\n\nvoid setup() {\n  Serial.begin(115200);\n  dht.begin();\n}\n\nvoid loop() {\n  float t = dht.readTemperature();\n  if (!isnan(t)) Serial.println(t);\n  delay(2000);\n}`;
        wiring = [['VCC', '3.3V / 5V'], ['GND', 'GND'], ['DATA', `Pin ${pin}`]];
    } else if (sensor === 'ultrasonic') {
        const p = pin.split(',');
        const t = p[0], e = p[1] || 5;
        code += `#define TRIG ${t}\n#define ECHO ${e}\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);\n}\n\nvoid loop() {\n  digitalWrite(TRIG, LOW); delayMicroseconds(2);\n  digitalWrite(TRIG, HIGH); delayMicroseconds(10);\n  digitalWrite(TRIG, LOW);\n  long duration = pulseIn(ECHO, HIGH);\n  Serial.print("Dist: "); Serial.println(duration * 0.034 / 2);\n  delay(500);\n}`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['TRIG', `Pin ${t}`], ['ECHO', `Pin ${e}`]];
    } else if (sensor === 'mq2') {
        code += `#define SMOKE_PIN ${pin}\n\nvoid setup() { Serial.begin(115200); }\n\nvoid loop() {\n  int val = analogRead(SMOKE_PIN);\n  Serial.print("Smoke: "); Serial.println(val);\n  delay(1000);\n}`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['A0', `Analog Pin ${pin}`]];
    } else if (sensor === 'lcd') {
        code += `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n  lcd.init(); lcd.backlight();\n  lcd.print("AetherVibe OK!");\n}\n\nvoid loop() { }`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['SDA', 'A4 / 21'], ['SCL', 'A5 / 22']];
    }

    document.getElementById('iotEmpty').classList.add('hidden');
    document.getElementById('codeOutput').value = code;
    const wArea = document.getElementById('wiringArea');
    wArea.classList.remove('hidden');
    document.getElementById('wiringTable').innerHTML = wiring.map(w => `<div class="flex justify-between py-1.5 border-b border-white/5"><span>${w[0]}</span><span class="text-indigo-400 font-bold">→ ${w[1]}</span></div>`).join('');
    showToast('🚀 Kode Berhasil Dibuat!');
}

function copyCode() {
    const code = document.getElementById('codeOutput');
    if(!code.value) return;
    navigator.clipboard.writeText(code.value);
    showToast('📋 Kode Disalin ke Clipboard!');
}

// --- AI Engine ---
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const voiceToggle = document.getElementById('voiceToggle');

let currentImg = null;
let voiceActive = false;
let isTyping = false;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            currentImg = re.target.result.split(',')[1];
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

document.getElementById('clearImg').onclick = () => {
    currentImg = null;
    imageInput.value = '';
    imagePreview.classList.add('hidden');
};

voiceToggle.onclick = () => {
    voiceActive = !voiceActive;
    voiceToggle.classList.toggle('bg-sky-600', voiceActive);
    voiceToggle.classList.toggle('text-white', voiceActive);
    if(!voiceActive) window.speechSynthesis.cancel();
};

async function askGemini() {
    const msg = chatInput.value.trim();
    if ((!msg && !currentImg) || isTyping) return;

    isTyping = true;
    appendMsg('user', msg);
    chatInput.value = '';

    const tempId = 'loader-' + Date.now();
    appendMsg('bot', '<span class="animate-pulse">Sedang menganalisis data lab...</span>', tempId);

    const payload = {
        contents: [{
            parts: [{ text: `Kamu adalah partner lab SMK Jaringan & IoT. Jawab dengan ramah & teknis tapi mudah dimengerti. Pertanyaan: ${msg}` }]
        }]
    };
    if (currentImg) {
        payload.contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: currentImg } });
        document.getElementById('clearImg').click();
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        const text = data.candidates[0].content.parts[0].text;
        
        document.getElementById(tempId).remove();
        await typewriterEffect(text);
    } catch (e) {
        document.getElementById(tempId).innerHTML = '<span class="text-rose-400">Maaf, koneksi ke asisten terputus. Silakan coba lagi.</span>';
    } finally {
        isTyping = false;
    }
}

function appendMsg(sender, text, id) {
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-2 animate-fadeIn';
    if(id) div.id = id;
    const bubble = document.createElement('div');
    bubble.className = sender === 'user' 
        ? 'bg-sky-600 rounded-2xl rounded-tr-none p-4 max-w-[90%] text-sm self-end shadow-lg shadow-sky-900/20' 
        : 'bg-slate-800/60 rounded-2xl rounded-tl-none p-4 max-w-[90%] text-sm border border-white/5';
    bubble.innerHTML = text;
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function typewriterEffect(text) {
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-2 animate-fadeIn';
    const b = document.createElement('div');
    b.className = 'bg-slate-800/60 rounded-2xl rounded-tl-none p-4 max-w-[90%] text-sm border border-white/5';
    div.appendChild(b);
    chatWindow.appendChild(div);

    const formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    let i = 0;
    
    if (voiceActive) {
        const u = new SpeechSynthesisUtterance(text.replace(/[#*]/g, ''));
        u.lang = 'id-ID';
        window.speechSynthesis.speak(u);
    }

    return new Promise(resolve => {
        function type() {
            if (i < text.length) {
                b.innerHTML = text.substring(0, i + 1).replace(/\n/g, '<br>');
                i++;
                chatWindow.scrollTop = chatWindow.scrollHeight;
                setTimeout(type, 15);
            } else {
                b.innerHTML = formatted;
                resolve();
            }
        }
        type();
    });
}

// --- PDF & Extras ---
function toggleCheatSheet() {
    const m = document.getElementById('cheatSheetModal');
    m.classList.toggle('hidden');
    m.classList.toggle('flex');
}

function toggleGuide() {
    const m = document.getElementById('guideModal');
    m.classList.toggle('hidden');
    m.classList.toggle('flex');
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 297, 'F');
    
    doc.setTextColor(56, 189, 248);
    doc.setFontSize(22);
    doc.text("LAPORAN PRAKTIKUM SYNTAXTRUST", 20, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 20, 35);
    
    let y = 50;
    
    // Subnetting Result
    if(!document.getElementById('subnetResult').classList.contains('hidden')) {
        doc.setFontSize(14);
        doc.setTextColor(56, 189, 248);
        doc.text("1. Perhitungan Jaringan", 20, y);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text(`- Network: ${document.getElementById('resNetwork').textContent}`, 25, y+10);
        doc.text(`- Mask: ${document.getElementById('resMask').textContent}`, 25, y+15);
        doc.text(`- Broadcast: ${document.getElementById('resBroadcast').textContent}`, 25, y+20);
        y += 35;
    }
    
    // IoT Code
    const code = document.getElementById('codeOutput').value;
    if(code) {
        doc.setFontSize(14);
        doc.setTextColor(56, 189, 248);
        doc.text("2. Firmware IoT", 20, y);
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        const split = doc.splitTextToSize(code, 170);
        doc.text(split, 20, y+10);
    }
    
    doc.save("Laporan_Praktikum_SyntaxTrust.pdf");
    showToast('📂 Laporan Berhasil Diunduh!');
}

document.getElementById('sendBtn').onclick = askGemini;
document.getElementById('chatInput').onkeydown = (e) => { if(e.key === 'Enter') askGemini(); };
