const API_KEY = 'AIzaSyD_Z5YhkKoq45qF0JccPYNFJyAxznMG8RI';
const MODEL = 'gemini-1.5-flash';

// --- Subnetting Calculator ---
function calculateSubnet() {
    const ip = document.getElementById('ipInput').value.trim();
    const cidr = parseInt(document.getElementById('cidrInput').value);

    if (!ip || isNaN(cidr) || cidr < 0 || cidr > 32) {
        alert('Please enter a valid IP and CIDR prefix (0-32).');
        return;
    }

    try {
        const ipParts = ip.split('.').map(Number);
        if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255)) throw new Error();

        // Calculate mask
        let mask = [];
        for (let i = 0; i < 4; i++) {
            let n = Math.min(Math.max(cidr - i * 8, 0), 8);
            mask.push(256 - Math.pow(2, 8 - n));
        }

        // Calculate network
        const network = ipParts.map((p, i) => p & mask[i]);

        // Calculate broadcast
        const broadcast = network.map((p, i) => p | (255 - mask[i]));

        // Calculate usable range
        const first = [...network]; first[3]++;
        const last = [...broadcast]; last[3]--;

        // Display results
        document.getElementById('subnetResult').classList.remove('hidden');
        document.getElementById('resNetwork').textContent = network.join('.');
        document.getElementById('resMask').textContent = mask.join('.');
        document.getElementById('resBroadcast').textContent = broadcast.join('.');
        document.getElementById('resRange').textContent = `${first.join('.')} - ${last.join('.')}`;

        // Visual Mapping
        const visual = document.getElementById('subnetVisual');
        visual.innerHTML = '';
        for (let i = 0; i < 32; i++) {
            const bit = document.createElement('div');
            bit.className = `w-2 h-4 rounded-sm ${i < cidr ? 'bg-sky-500' : 'bg-slate-700'}`;
            bit.title = i < cidr ? 'Network Bit' : 'Host Bit';
            visual.appendChild(bit);
        }
    } catch (e) {
        alert('Error calculating subnet. Ensure IP format is correct.');
    }
}

// --- IoT Code Generator ---
function generateIoTCode() {
    const board = document.getElementById('boardSelect').value;
    const sensor = document.getElementById('sensorSelect').value;
    const pin = document.getElementById('pinInput').value || (sensor === 'ultrasonic' ? '4,5' : '4');
    
    let code = `// --- Generated IoT Code for ${board.toUpperCase()} ---\n`;
    
    if (sensor === 'dht22') {
        code += `#include "DHT.h"\n#define DHTPIN ${pin}\n#define DHTTYPE DHT22\nDHT dht(DHTPIN, DHTTYPE);\n\nvoid setup() {\n  Serial.begin(115200);\n  dht.begin();\n}\n\nvoid loop() {\n  float t = dht.readTemperature();\n  Serial.println(t);\n  delay(2000);\n}`;
    } else if (sensor === 'ultrasonic') {
        const pins = pin.split(',');
        const trig = pins[0];
        const echo = pins[1] || parseInt(trig) + 1;
        code += `#define TRIG_PIN ${trig}\n#define ECHO_PIN ${echo}\n\nvoid setup() {\n  Serial.begin(115200);\n  pinMode(TRIG_PIN, OUTPUT);\n  pinMode(ECHO_PIN, INPUT);\n}\n\nvoid loop() {\n  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);\n  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);\n  digitalWrite(TRIG_PIN, LOW);\n  long duration = pulseIn(ECHO_PIN, HIGH);\n  Serial.print("Distance: "); Serial.println(duration * 0.034 / 2);\n  delay(500);\n}`;
    } else if (sensor === 'mq2') {
        code += `#define MQ2_PIN ${pin}\n\nvoid setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  int val = analogRead(MQ2_PIN);\n  Serial.print("Smoke Level: "); Serial.println(val);\n  if(val > 400) Serial.println("DANGER!");\n  delay(1000);\n}`;
    } else if (sensor === 'lcd') {
        code += `#include <Wire.h>\n#include <LiquidCrystal_I2C.h>\n\nLiquidCrystal_I2C lcd(0x27, 16, 2);\n\nvoid setup() {\n  lcd.init();\n  lcd.backlight();\n  lcd.setCursor(0,0);\n  lcd.print("SMK BISA!");\n}\n\nvoid loop() {\n  lcd.setCursor(0,1);\n  lcd.print("Lab IoT Active");\n}`;
    }

    document.getElementById('codeOutput').value = code;
}

function copyCode() {
    const code = document.getElementById('codeOutput');
    code.select();
    document.execCommand('copy');
    alert('Code copied to clipboard!');
}

// --- Chatbot Assistant ---
const chatWindow = document.getElementById('chatWindow');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const clearImg = document.getElementById('clearImg');
const voiceToggle = document.getElementById('voiceToggle');

let currentImageBase64 = null;
let voiceEnabled = false;

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
            currentImageBase64 = re.target.result.split(',')[1];
            imagePreview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

clearImg.addEventListener('click', () => {
    currentImageBase64 = null;
    imageInput.value = '';
    imagePreview.classList.add('hidden');
});

voiceToggle.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    voiceToggle.classList.toggle('bg-sky-600', voiceEnabled);
    voiceToggle.classList.toggle('text-white', voiceEnabled);
    if (!voiceEnabled) window.speechSynthesis.cancel();
});

async function askGemini(message) {
    const msg = message || chatInput.value.trim();
    if (!msg && !currentImageBase64) return;

    appendMessage('user', msg);
    chatInput.value = '';

    const typingId = 'typing-' + Date.now();
    appendMessage('bot', 'Menganalisis...', typingId);

    const payload = {
        contents: [{
            parts: [
                { text: `Kamu adalah asisten Lab IoT dan Jaringan SMK yang handal. 
                Tugasmu membantu siswa dengan pertanyaan seputar Subnetting, MikroTik, Cisco, Arduino, ESP32, dan sensor IoT. 
                Jika ada gambar, jelaskan alat apa itu dan bagaimana cara menggunakannya/konfigurasinya.
                Gunakan bahasa Indonesia yang ramah. Pertanyaan: ${msg}` }
            ]
        }]
    };

    if (currentImageBase64) {
        payload.contents[0].parts.push({
            inline_data: {
                mime_type: "image/jpeg",
                data: currentImageBase64
            }
        });
        clearImg.click(); // Reset image after sending
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        const botResponse = data.candidates[0].content.parts[0].text;
        
        const typingIndicator = document.getElementById(typingId);
        if (typingIndicator) typingIndicator.remove();
        
        await appendMessageWithTyping('bot', botResponse);
        
        if (voiceEnabled) {
            const utterance = new SpeechSynthesisUtterance(botResponse.replace(/[#*]/g, ''));
            utterance.lang = 'id-ID';
            window.speechSynthesis.speak(utterance);
        }
    } catch (error) {
        console.error(error);
        const typingIndicator = document.getElementById(typingId);
        if (typingIndicator) typingIndicator.textContent = 'Maaf, otak AI saya sedang lelah.';
    }
}

async function appendMessageWithTyping(sender, text) {
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-1';

    const bubble = document.createElement('div');
    bubble.className = 'bg-slate-800 rounded-2xl rounded-tl-none p-4 max-w-[85%] text-sm';
    
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    
    const formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    
    // Typewriter effect logic
    let i = 0;
    const speed = 10; // ms per char
    
    return new Promise((resolve) => {
        function type() {
            if (i < text.length) {
                // We use a simplified version of typing for performance, 
                // but handle the HTML formatting at the end or incrementally.
                // To support HTML tags, we'll just set the full HTML but animate opacity or similar,
                // OR we can type the raw text and then replace with formatted.
                // Let's do a smooth text-reveal.
                bubble.innerHTML = text.substring(0, i + 1).replace(/\n/g, '<br>');
                i++;
                chatWindow.scrollTop = chatWindow.scrollHeight;
                setTimeout(type, speed);
            } else {
                bubble.innerHTML = formattedText; // Ensure final formatting is correct
                resolve();
            }
        }
        type();
    });
}

function appendMessage(sender, text, id = null) {
    const div = document.createElement('div');
    div.className = 'flex flex-col gap-1';
    if (id) div.id = id;

    const bubble = document.createElement('div');
    bubble.className = sender === 'user' 
        ? 'bg-sky-600 rounded-2xl rounded-tr-none p-4 max-w-[85%] text-sm self-end'
        : 'bg-slate-800 rounded-2xl rounded-tl-none p-4 max-w-[85%] text-sm';
    
    // Simple markdown-to-html for bot response
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    
    div.appendChild(bubble);
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

sendBtn.addEventListener('click', () => {
    const msg = chatInput.value.trim();
    if (msg) askGemini(msg);
});

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const msg = chatInput.value.trim();
        if (msg) askGemini(msg);
    }
});
// --- PDF Export Logic ---
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Lab Report: IoT & Network Helper", 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 30);
    
    // Subnet Section
    if (!document.getElementById('subnetResult').classList.contains('hidden')) {
        doc.setFontSize(16);
        doc.text("Network Calculation", 20, 45);
        doc.setFontSize(10);
        doc.text(`Network: ${document.getElementById('resNetwork').textContent}`, 20, 55);
        doc.text(`Mask: ${document.getElementById('resMask').textContent}`, 20, 60);
        doc.text(`Broadcast: ${document.getElementById('resBroadcast').textContent}`, 20, 65);
        doc.text(`Range: ${document.getElementById('resRange').textContent}`, 20, 70);
    }
    
    // IoT Code Section
    const code = document.getElementById('codeOutput').value;
    if (code) {
        doc.setFontSize(16);
        doc.text("Generated IoT Code", 20, 85);
        doc.setFontSize(8);
        const splitCode = doc.splitTextToSize(code, 170);
        doc.text(splitCode, 20, 95);
    }
    
    // Chat History
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Lab Assistant Consultation", 20, 20);
    doc.setFontSize(10);
    let y = 35;
    const messages = chatWindow.innerText.split('\n');
    messages.forEach(msg => {
        if (msg.trim()) {
            const splitMsg = doc.splitTextToSize(msg, 170);
            if (y > 270) { doc.addPage(); y = 20; }
            doc.text(splitMsg, 20, y);
            y += (splitMsg.length * 5) + 5;
        }
    });
    
    doc.save("Lab_Report_JuaraVibe.pdf");
}
