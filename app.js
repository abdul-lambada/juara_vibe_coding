const API_KEY = 'AIzaSyD_Z5YhkKoq45qF0JccPYNFJyAxznMG8RI';
const MODEL = 'gemini-1.5-flash';

// --- UI Navigation ---
function switchTab(tab) {
    document.querySelectorAll('.tab-content, .animate-fadeIn').forEach(el => {
        if(el.id && el.id.startsWith('tab-')) el.classList.add('hidden');
    });
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    // Update button styles
    document.getElementById('btn-subnet').className = tab === 'subnet' 
        ? 'tab-active px-8 py-3 rounded-xl text-sm font-bold transition-all'
        : 'px-8 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white';
    document.getElementById('btn-iot').className = tab === 'iot' 
        ? 'tab-active px-8 py-3 rounded-xl text-sm font-bold transition-all'
        : 'px-8 py-3 rounded-xl text-sm font-bold transition-all text-slate-400 hover:text-white';
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// --- Subnetting Calculator ---
function calculateSubnet() {
    const ip = document.getElementById('ipInput').value.trim();
    const cidr = parseInt(document.getElementById('cidrInput').value);

    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) {
        showToast('❌ Masukkan IP dan CIDR yang valid!');
        return;
    }

    try {
        const ipParts = ip.split('.').map(Number);
        if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255)) throw new Error();

        let mask = [];
        for (let i = 0; i < 4; i++) {
            let n = Math.min(Math.max(cidr - i * 8, 0), 8);
            mask.push(256 - Math.pow(2, 8 - n));
        }

        const network = ipParts.map((p, i) => p & mask[i]);
        const broadcast = network.map((p, i) => p | (255 - mask[i]));
        const first = [...network]; first[3]++;
        const last = [...broadcast]; last[3]--;

        document.getElementById('subnetEmpty').classList.add('hidden');
        document.getElementById('subnetResult').classList.remove('hidden');
        document.getElementById('resNetwork').textContent = network.join('.');
        document.getElementById('resMask').textContent = mask.join('.');
        document.getElementById('resBroadcast').textContent = broadcast.join('.');
        document.getElementById('resRange').textContent = `${first.join('.')} - ${last.join('.')}`;

        const visual = document.getElementById('subnetVisual');
        visual.innerHTML = '';
        for (let i = 0; i < 32; i++) {
            const bit = document.createElement('div');
            bit.className = `w-2 h-4 rounded-full ${i < cidr ? 'bg-sky-500 shadow-[0_0_8px_#0ea5e9]' : 'bg-slate-800'}`;
            visual.appendChild(bit);
        }
        showToast('✅ Kalkulasi berhasil!');
    } catch (e) {
        showToast('❌ Error: Cek format IP Anda.');
    }
}

// --- IoT Code Generator ---
function generateIoTCode() {
    const board = document.getElementById('boardSelect').value;
    const sensor = document.getElementById('sensorSelect').value;
    const pin = document.getElementById('pinInput').value || (sensor === 'ultrasonic' ? '4,5' : '4');
    
    let code = `// --- Generated for ${board.toUpperCase()} ---\n`;
    let wiring = [];

    if (sensor === 'dht22') {
        code += `#include "DHT.h"\n#define DHTPIN ${pin}\n#define DHTTYPE DHT22\nDHT dht(DHTPIN, DHTTYPE);\n\nvoid setup() {\n  Serial.begin(115200);\n  dht.begin();\n}\n\nvoid loop() {\n  float t = dht.readTemperature();\n  Serial.println(t);\n  delay(2000);\n}`;
        wiring = [['VCC', '3.3V/5V'], ['GND', 'GND'], ['DATA', `Digital Pin ${pin}`]];
    } else if (sensor === 'ultrasonic') {
        const p = pin.split(',');
        code += `#define TRIG ${p[0]}\n#define ECHO ${p[1]||5}\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);\n}\nvoid loop() {\n  digitalWrite(TRIG, HIGH); delayMicroseconds(10); digitalWrite(TRIG, LOW);\n  long d = pulseIn(ECHO, HIGH) * 0.034 / 2;\n  Serial.println(d);\n  delay(500);\n}`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['TRIG', `Pin ${p[0]}`], ['ECHO', `Pin ${p[1]||5}`]];
    } else if (sensor === 'mq2') {
        code += `#define MQ2 ${pin}\nvoid setup() { Serial.begin(115200); }\nvoid loop() {\n  int v = analogRead(MQ2);\n  Serial.println(v);\n  delay(1000);\n}`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['A0', `Analog Pin ${pin}`]];
    } else if (sensor === 'lcd') {
        code += `#include <LiquidCrystal_I2C.h>\nLiquidCrystal_I2C lcd(0x27, 16, 2);\nvoid setup() {\n  lcd.init(); lcd.backlight();\n  lcd.print("SMK BISA!");\n}`;
        wiring = [['VCC', '5V'], ['GND', 'GND'], ['SDA', 'A4 / 21'], ['SCL', 'A5 / 22']];
    }

    document.getElementById('iotEmpty').classList.add('hidden');
    document.getElementById('codeOutput').value = code;
    const wArea = document.getElementById('wiringArea');
    const wTable = document.getElementById('wiringTable');
    wArea.classList.remove('hidden');
    wTable.innerHTML = wiring.map(w => `<div class="flex justify-between py-1 border-b border-white/5"><span>${w[0]}</span><span class="text-indigo-400 font-bold">→ ${w[1]}</span></div>`).join('');
    showToast('🚀 Kode berhasil dibuat!');
}

function copyCode() {
    const code = document.getElementById('codeOutput');
    code.select();
    document.execCommand('copy');
    showToast('📋 Kode disalin!');
}

// --- AI Assistant ---
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const clearImg = document.getElementById('clearImg');
const voiceToggle = document.getElementById('voiceToggle');

let currentImage = null;
let voiceOn = false;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            currentImage = re.target.result.split(',')[1];
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

clearImg.addEventListener('click', () => { currentImage = null; imageInput.value = ''; imagePreview.classList.add('hidden'); });
voiceToggle.addEventListener('click', () => { 
    voiceOn = !voiceOn; 
    voiceToggle.classList.toggle('bg-sky-600', voiceOn);
    voiceToggle.classList.toggle('text-white', voiceOn);
});

async function askGemini() {
    const msg = chatInput.value.trim();
    if (!msg && !currentImage) return;

    appendMsg('user', msg);
    chatInput.value = '';

    const tid = 't-' + Date.now();
    appendMsg('bot', 'Menganalisis...', tid);

    const payload = {
        contents: [{
            parts: [{ text: `Kamu asisten Lab SMK. Bantu siswa tentang Networking/IoT. Pertanyaan: ${msg}` }]
        }]
    };
    if (currentImage) {
        payload.contents[0].parts.push({ inline_data: { mime_type: "image/jpeg", data: currentImage } });
        clearImg.click();
    }

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        const text = data.candidates[0].content.parts[0].text;
        
        document.getElementById(tid).remove();
        await typeMsg(text);

        if (voiceOn) {
            const u = new SpeechSynthesisUtterance(text.replace(/[#*]/g, ''));
            u.lang = 'id-ID';
            window.speechSynthesis.speak(u);
        }
    } catch (e) {
        document.getElementById(tid).textContent = 'Maaf, terjadi gangguan.';
    }
}

function appendMsg(sender, text, id) {
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-2';
    if(id) div.id = id;
    const b = document.createElement('div');
    b.className = sender === 'user' ? 'bg-sky-600 rounded-2xl rounded-tr-none p-4 max-w-[90%] text-sm self-end' : 'bg-slate-800/60 rounded-2xl rounded-tl-none p-4 max-w-[90%] text-sm';
    b.innerHTML = text.replace(/\n/g, '<br>');
    div.appendChild(b);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function typeMsg(text) {
    const div = document.createElement('div');
    const b = document.createElement('div');
    b.className = 'bg-slate-800/60 rounded-2xl rounded-tl-none p-4 max-w-[90%] text-sm';
    div.appendChild(b);
    chatWindow.appendChild(div);

    const fmt = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    let i = 0;
    return new Promise(r => {
        function t() {
            if (i < text.length) {
                b.innerHTML = text.substring(0, i+1).replace(/\n/g, '<br>');
                i++;
                chatWindow.scrollTop = chatWindow.scrollHeight;
                setTimeout(t, 10);
            } else {
                b.innerHTML = fmt;
                r();
            }
        }
        t();
    });
}

function toggleCheatSheet() { document.getElementById('cheatSheetModal').classList.toggle('hidden'); document.getElementById('cheatSheetModal').classList.toggle('flex'); }

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Lab Report - AetherVibe", 20, 20);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);
    doc.save("AetherVibe_Report.pdf");
    showToast('📂 Report berhasil diunduh!');
}

sendBtn.addEventListener('click', askGemini);
chatInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') askGemini(); });
function toggleGuide() { document.getElementById('guideModal').classList.toggle('hidden'); document.getElementById('guideModal').classList.toggle('flex'); }
