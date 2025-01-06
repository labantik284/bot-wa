const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const fs = require("fs");
const path = require("path");

// Membuat client baru menggunakan LocalAuth untuk autentikasi
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: false, // Menjalankan browser dalam mode non-headless (dengan UI)
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// Folder penyimpanan
const storageFolder = path.join(__dirname, "images");
if (!fs.existsSync(storageFolder)) {
  fs.mkdirSync(storageFolder);
}

// Menghasilkan QR Code untuk pemindaian
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan QR Code with your WhatsApp mobile app.");
});

// Menandakan bahwa bot sudah berhasil diautentikasi
client.on("authenticated", () => {
  console.log("Authenticated!");
});

// Menandakan bahwa bot sudah siap digunakan
client.on("ready", () => {
  console.log("Client is ready!");
});

// Menangani pesan masuk
client.on("message", async (message) => {
  const chat = await message.getChat();

  // Logika menyapa pengguna
  if (!chat.isGroup && message.body.toLowerCase() === "hello") {
    await chat.sendMessage("Hi, I am the Tag All bot!");
  }

  // Logika tag semua anggota grup
  if (
    chat.isGroup &&
    (message.body.split(" ").includes("@everyone") ||
      message.body.split(" ").includes("@team"))
  ) {
    let text = "";
    let mentions = [];

    for (let participant of chat.participants) {
      const contact = await client.getContactById(participant.id._serialized);
      mentions.push(contact);
      text += `@${participant.id.user} `;
    }

    await chat.sendMessage(text, { mentions });
  }

  // Logika menyimpan foto
  if (message.body.startsWith("!simpanfoto") && message.hasMedia) {
    const name = message.body.replace("!simpanfoto", "").trim();
    if (!name) {
      await chat.sendMessage("Mohon berikan nama untuk menyimpan foto.");
      return;
    }

    const media = await message.downloadMedia();
    if (media) {
      const filePath = path.join(storageFolder, `${name}.jpg`);
      fs.writeFileSync(filePath, Buffer.from(media.data, "base64"));
      await chat.sendMessage(`Foto berhasil disimpan dengan nama: ${name}`);
    } else {
      await chat.sendMessage("Gagal mengunduh media.");
    }
  }

  // Logika mengirim foto berdasarkan nama
  if (message.body.startsWith("!kirimfoto")) {
    const name = message.body.replace("!kirimfoto", "").trim();
    if (!name) {
      await chat.sendMessage("Mohon berikan nama foto yang ingin Anda minta.");
      return;
    }

    const filePath = path.join(storageFolder, `${name}.jpg`);
    if (fs.existsSync(filePath)) {
      const media = MessageMedia.fromFilePath(filePath);
      await chat.sendMessage(media);
    } else {
      await chat.sendMessage("Foto dengan nama tersebut tidak ditemukan.");
    }
  }
});

// Inisialisasi client
client.initialize();
