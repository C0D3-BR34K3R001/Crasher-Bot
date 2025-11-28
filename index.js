//by CODEBREAKER 🗿
//https://whatsapp.com/channel/0029Vb70IdY60eBmvtGRT00R

const {
    Telegraf,
    Markup
} = require("telegraf");
const fs = require('fs');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const chalk = require('chalk');
const axios = require('axios');
const moment = require('moment-timezone');
const {
    BOT_TOKEN,
    allowedDevelopers
} = require("./config");
const tdxlol = fs.readFileSync('./tdx.jpeg');
const crypto = require('crypto');

// --- Initialize Telegram Bot ---
const bot = new Telegraf(BOT_TOKEN);

// --- Global Variables ---
let zephy = null;
let isWhatsAppConnected = false;
let maintenanceConfig = {
    maintenance_mode: false,
    message: "⛔ Sorry, this script is currently under maintenance by the developer @devemps. Please wait until it's finished!!"
};
let premiumUsers = {};
let adminList = [];
let ownerList = [];
let deviceList = [];
let userActivity = {};
let allowedBotTokens = [];
let ownerStatus;
let adminStatus;
let premiumStatus;
let whatsappUserInfo = null;
let bugCooldown = 0;
let userLastAttack = new Map();

// --- Helper Functions ---
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Check if User is Owner ---
const isOwner = (userId) => {
    if (ownerList.includes(userId.toString())) {
        ownerStatus = "✅";
        return true;
    } else {
        ownerStatus = "❌";
        return false;
    }
};

const OWNER_ID = (userId) => {
    if (allowedDevelopers.includes(userId.toString())) {
        return true;
    } else {
        return false;
    }
};

// --- Check if User is Admin ---
const isAdmin = (userId) => {
    if (adminList.includes(userId.toString())) {
        adminStatus = "✅";
        return true;
    } else {
        adminStatus = "❌";
        return false;
    }
};

// --- Add Admin ---
const addAdmin = (userId) => {
    if (!adminList.includes(userId)) {
        adminList.push(userId);
        saveAdmins();
    }
};

// --- Remove Admin ---
const removeAdmin = (userId) => {
    adminList = adminList.filter(id => id !== userId);
    saveAdmins();
};

// --- Save Admin List ---
const saveAdmins = () => {
    fs.writeFileSync('./admins.json', JSON.stringify(adminList));
};

// --- Load Admin List ---
const loadAdmins = () => {
    try {
        const data = fs.readFileSync('./admins.json');
        adminList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Failed to load admin list:'), error);
        adminList = [];
    }
};

// --- Cooldown Function ---
function checkCooldown(userId) {
    if (!userLastAttack.has(userId)) {
        return {
            canAttack: true,
            remainingTime: 0
        };
    }

    const lastAttack = userLastAttack.get(userId);
    const now = Date.now();
    const timePassed = (now - lastAttack) / 1000;

    if (timePassed < bugCooldown) {
        return {
            canAttack: false,
            remainingTime: Math.ceil(bugCooldown - timePassed)
        };
    }

    return {
        canAttack: true,
        remainingTime: 0
    };
}

// --- Check Premium Status ---
const isPremiumUser = (userId) => {
    const userData = premiumUsers[userId];
    if (!userData) {
        premiumStatus = "❌";
        return false;
    }

    const now = moment().tz('Asia/Jakarta');
    const expirationDate = moment(userData.expired, 'YYYY-MM-DD HH:mm:ss').tz('Asia/Jakarta');

    if (now.isBefore(expirationDate)) {
        premiumStatus = "✅";
        return true;
    } else {
        premiumStatus = "❌";
        return false;
    }
};

// --- Premium User Management Functions ---
const loadPremiumUsers = () => {
    try {
        if (fs.existsSync('./premiumUsers.json')) {
            const data = fs.readFileSync('./premiumUsers.json', 'utf8');
            premiumUsers = JSON.parse(data);
        } else {
            premiumUsers = {};
            savePremiumUsers();
        }
    } catch (error) {
        console.error('Error loading premium users:', error);
        premiumUsers = {};
    }
};

const savePremiumUsers = () => {
    try {
        const safeData = {};
        for (const [userId, userData] of Object.entries(premiumUsers)) {
            safeData[userId] = {
                expired: userData.expired
            };
        }
        const jsonString = JSON.stringify(safeData, null, 2);
        fs.writeFileSync('./premiumUsers.json', jsonString);
    } catch (error) {
        console.error('Error saving premium users:', error);
    }
};

const addPremiumUser = (userId, durationDays) => {
    try {
        if (!userId || !durationDays) {
            throw new Error('Invalid user ID or duration');
        }
        const expirationDate = moment().tz('Asia/Jakarta').add(durationDays, 'days');
        premiumUsers[userId] = {
            expired: expirationDate.format('YYYY-MM-DD HH:mm:ss')
        };
        savePremiumUsers();
    } catch (error) {
        console.error('Error adding premium user:', error);
        throw error;
    }
};

const removePremiumUser = (userId) => {
    delete premiumUsers[userId];
    savePremiumUsers();
};

// --- Load Device List ---
const loadDeviceList = () => {
    try {
        const data = fs.readFileSync('./ListDevice.json');
        deviceList = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Failed to load device list:'), error);
        deviceList = [];
    }
};

// --- Save Device List ---
const saveDeviceList = () => {
    fs.writeFileSync('./ListDevice.json', JSON.stringify(deviceList));
};

// --- Add Device to List ---
const addDeviceToList = (userId, token) => {
    const deviceNumber = deviceList.length + 1;
    deviceList.push({
        number: deviceNumber,
        userId: userId,
        token: token
    });
    saveDeviceList();
    console.log(chalk.white.bold(`
╭─────────────────
┃ NEW DEVICE DETECTED
┃ DEVICE NUMBER: ${chalk.yellow.bold(deviceNumber)}
╰─────────────────`));
};

// --- Record User Activity ---
const recordUserActivity = (userId, userNickname) => {
    const now = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    userActivity[userId] = {
        nickname: userNickname,
        last_seen: now
    };
    fs.writeFileSync('./userActivity.json', JSON.stringify(userActivity));
};

// --- Load User Activity ---
const loadUserActivity = () => {
    try {
        const data = fs.readFileSync('./userActivity.json');
        userActivity = JSON.parse(data);
    } catch (error) {
        console.error(chalk.red('Failed to load user activity:'), error);
        userActivity = {};
    }
};

// --- Middleware to Check Maintenance Mode ---
const checkMaintenance = async (ctx, next) => {
    let userId, userNickname;

    if (ctx.from) {
        userId = ctx.from.id.toString();
        userNickname = ctx.from.first_name || userId;
    } else if (ctx.update.channel_post && ctx.update.channel_post.sender_chat) {
        userId = ctx.update.channel_post.sender_chat.id.toString();
        userNickname = ctx.update.channel_post.sender_chat.title || userId;
    }

    if (userId) {
        recordUserActivity(userId, userNickname);
    }

    if (maintenanceConfig.maintenance_mode && !OWNER_ID(ctx.from.id)) {
        const escapedMessage = maintenanceConfig.message.replace(/\*/g, '\\*');
        return await ctx.replyWithMarkdown(escapedMessage);
    } else {
        await next();
    }
};

// --- Middleware to Check Premium Status ---
const checkPremium = async (ctx, next) => {
    if (isPremiumUser(ctx.from.id) || isAdmin(ctx.from.id) || isOwner(ctx.from.id) || OWNER_ID(ctx.from.id)) {
        await next();
    } else {
        const premiumMessage = `
 ⚡ Xatan Neverdie Project ⚡
 ╔══════════════════
 ║ ❌ ACCESS DENIED!
 ║ 💎 Status: NON-PREMIUM
 ║ ⚠️ Need Premium Access
 ╚══════════════════`;

        await ctx.reply(premiumMessage, {
            reply_markup: {
                inline_keyboard: [
                    [{
                        text: "💫 UPGRADE TO PREMIUM",
                        url: "https://t.me/devemps"
                    }],
                    [{
                        text: "📖 PREMIUM FEATURES",
                        callback_data: "premium_info"
                    }]
                ]
            }
        });
    }
};

// --- WhatsApp Connection ---
const startSesi = async () => {
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 10000;

    const attemptConnection = async () => {
        try {
            console.log(chalk.yellow.bold(`🔄 Attempting WhatsApp connection (${retryCount + 1}/${maxRetries})...`));
            
            const { state, saveCreds } = await useMultiFileAuthState('./session');
            const { version } = await fetchLatestBaileysVersion();

            const connectionOptions = {
                version,
                logger: pino({ level: "silent" }),
                auth: state,
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 10000,
                defaultQueryTimeoutMs: 0,
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                getMessage: async (key) => {
                    return {
                        conversation: 'hello'
                    }
                },
            };

            zephy = makeWASocket(connectionOptions);
            zephy.ev.on('creds.update', saveCreds);

            zephy.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect } = update;

                if (connection === 'open') {
                    isWhatsAppConnected = true;
                    whatsappUserInfo = {
                        name: zephy?.user?.name,
                        id: zephy?.user?.id
                    };
                    retryCount = 0;

                    const successMessage = `
╭═══════『 WhatsApp Connected 』═══════⊱
│
├─────『 Status 』
│ • Status: Connected Successfully ✅
│ • User: ${whatsappUserInfo.name || 'N/A'}
│ • Time: ${new Date().toLocaleString()}
│
╰═════════════════════⊱`;

                    console.log(chalk.green.bold('✅ WhatsApp connected successfully!'));
                    
                    try {
                        for (const ownerId of allowedDevelopers) {
                            await bot.telegram.sendMessage(ownerId, successMessage);
                        }
                    } catch (error) {
                        console.error('Error sending connect notification:', error);
                    }
                }

                if (connection === 'close') {
                    isWhatsAppConnected = false;
                    whatsappUserInfo = null;
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    console.log(chalk.red.bold(`❌ Connection closed. Status code: ${statusCode}`));

                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log(chalk.red.bold('🔴 WhatsApp logged out, clearing session...'));
                        const sessionPath = './session';
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                            console.log(chalk.yellow.bold('🗑️ Session cleared.'));
                        }
                        return;
                    }

                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    if (retryCount < maxRetries && shouldReconnect) {
                        retryCount++;
                        console.log(chalk.yellow.bold(`🔄 Reconnecting... Attempt ${retryCount}/${maxRetries}`));
                        await sleep(retryDelay);
                        return attemptConnection();
                    }

                    if (retryCount >= maxRetries) {
                        console.log(chalk.red.bold('❌ Max reconnection attempts reached. Use /addpairing to reconnect.'));
                    }
                }
            });

        } catch (error) {
            console.error('❌ Connection error:', error);
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(chalk.yellow.bold(`🔄 Retrying connection... Attempt ${retryCount}/${maxRetries}`));
                await sleep(retryDelay);
                return attemptConnection();
            } else {
                console.log(chalk.red.bold('❌ Failed to establish WhatsApp connection after maximum retries.'));
            }
        }
    };

    return attemptConnection();
};

// Initialize bot
(async () => {
    console.log(chalk.whiteBright.bold(`
╭──────────────────────────────────────────────╮
│                                              │
│        Welcome to Xatan Crasher              │
│     Crafted with Love By @devemps            │
│                                              │
╰──────────────────────────────────────────────╯`));

    // Load data
    loadPremiumUsers();
    loadAdmins();
    loadDeviceList();
    loadUserActivity();

    console.log(chalk.green.bold('📊 Data loaded successfully:'));
    console.log(chalk.blue.bold(`   • Premium Users: ${Object.keys(premiumUsers).length}`));
    console.log(chalk.blue.bold(`   • Admin Users: ${adminList.length}`));
    console.log(chalk.blue.bold(`   • Devices: ${deviceList.length}`));

    // Start WhatsApp connection
    await startSesi();
    
    // Add current device to list
    addDeviceToList(BOT_TOKEN, BOT_TOKEN);
    
    console.log(chalk.green.bold('🤖 Bot initialization complete!'));
})();

// --- Basic Commands ---
bot.command("start", async (ctx) => {
    const isPremium = isPremiumUser(ctx.from.id);
    const isAdminStatus = isAdmin(ctx.from.id);

    const mainMenuMessage = `
╭═══════『 Xatan Neverdie Project 』═══════⊱
│
├─────『 Status 』
│ • Premium: ${isPremium ? '✅ Active' : '❌ Not Active'}
│ • Admin: ${isAdminStatus ? '✅ Yes' : '❌ No'} 
│ • WhatsApp: ${isWhatsAppConnected ? '✅ Connected' : '❌ Disconnected'}
│
├─────『 Available Commands 』
│ • /bugmenu - Show bug commands
│ • /addpairing - Connect WhatsApp
│ • /checkcooldown - Check cooldown
│ • /status - Bot status
│
╰═════════════════════⊱`;

    const mainKeyboard = [
        [{
            text: "🎯 Bug Menu",
            callback_data: "bugmenu"
        }],
        [{
            text: "📊 Status Info", 
            callback_data: "statusinfo"
        }],
        [{
            text: "🔗 Connect WhatsApp",
            callback_data: "connect_whatsapp"
        }]
    ];

    await ctx.reply(mainMenuMessage, {
        reply_markup: {
            inline_keyboard: mainKeyboard
        }
    });
});

bot.command("status", async (ctx) => {
    const statusMessage = `
╭═══════『 Bot Status 』═══════⊱
│
├─────『 Connection 』
│ • WhatsApp: ${isWhatsAppConnected ? '✅ Connected' : '❌ Disconnected'}
│ • Telegram: ✅ Connected
│ • User: ${whatsappUserInfo?.name || 'N/A'}
│
├─────『 System 』
│ • Premium Users: ${Object.keys(premiumUsers).length}
│ • Admin Users: ${adminList.length}
│ • Cooldown: ${bugCooldown}s
│ • Total Devices: ${deviceList.length}
│
╰═════════════════════⊱`;

    await ctx.reply(statusMessage);
});

bot.command("addpairing", async (ctx) => {
    if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Sorry, you don't have access to use this command.");
    }

    const args = ctx.message.text.split(/\s+/);
    if (args.length < 2) {
        return await ctx.reply(`
╭═══════『 Pairing Guide 』═══════⊱
│
├─────『 Format 』
│ • /addpairing 628xxxxxxxxxx
│ • /addpairing +628xxxxxxxxxx
│ • /addpairing 08xxxxxxxxxx
│
╰═════════════════════⊱`);
    }

    let phoneNumber = args[1].replace(/[^0-9]/g, '');
    
    // Format phone number
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.slice(1);
    }
    if (!phoneNumber.startsWith('62')) {
        phoneNumber = '62' + phoneNumber;
    }

    try {
        if (!zephy) {
            await ctx.reply("⏳ Initializing WhatsApp connection...");
            await startSesi();
            await sleep(5000);
        }

        if (!zephy) {
            return await ctx.reply("❌ Failed to initialize WhatsApp connection.");
        }

        await ctx.reply("⏳ Processing pairing request...");

        // Try to get pairing code
        try {
            const pairingCode = await zephy.requestPairingCode(phoneNumber);
            
            if (pairingCode) {
                const pairingMessage = `
╭═══════『 Pairing Code 』═══════⊱
│
├─────『 Information 』
│ • Number: ${phoneNumber}
│ • Code: ${pairingCode}
│ • Status: Generated ✅
│ • Expires in: 30 seconds
│
├─────『 Instructions 』
│ 1. Open WhatsApp
│ 2. Go to Settings
│ 3. Linked Devices  
│ 4. Link a Device
│ 5. Enter code: ${pairingCode}
│
╰═════════════════════⊱`;

                await ctx.reply(pairingMessage);
            } else {
                throw new Error('No pairing code received');
            }
        } catch (pairingError) {
            console.error('Pairing code error:', pairingError);
            throw new Error('Failed to generate pairing code. Make sure the number is registered on WhatsApp.');
        }

    } catch (error) {
        console.error('Pairing Error:', error);
        await ctx.reply(`
╭═══════『 Pairing Error 』═══════⊱
│
├─────『 Error 』
│ • Failed to generate pairing code
│ • Number: ${phoneNumber}
│
├─────『 Solutions 』
│ • Make sure number is registered on WhatsApp
│ • Try again later
│ • Use different number
│
╰═════════════════════⊱`);
    }
});

bot.command("checkcooldown", async (ctx) => {
    const userId = ctx.from.id;
    const cooldownStatus = checkCooldown(userId);

    if (cooldownStatus.canAttack) {
        await ctx.reply("✅ You can attack now!");
    } else {
        await ctx.reply(`⏳ Wait ${cooldownStatus.remainingTime} more seconds before attacking.`);
    }
});

bot.command("setcooldown", async (ctx) => {
    if (!OWNER_ID(ctx.from.id) && !isOwner(ctx.from.id)) {
        return await ctx.reply("❌ Access denied.");
    }

    const args = ctx.message.text.split(/\s+/);
    if (args.length < 2 || isNaN(args[1])) {
        return await ctx.reply("❌ Format: /setcooldown <seconds>");
    }

    const newCooldown = parseInt(args[1]);
    if (newCooldown < 10 || newCooldown > 3600) {
        return await ctx.reply("❌ Cooldown must be between 10 - 3600 seconds!");
    }

    bugCooldown = newCooldown;
    await ctx.reply(`✅ Cooldown successfully set to ${bugCooldown} seconds.`);
});

// Callback handlers
bot.action('bugmenu', async (ctx) => {
    const menuMessage = `
╭═══════『 Bug Menu 』═══════⊱
│
├─────『 Available Commands 』
│ • /xatanCrash - Basic crash
│ • /xatanXbeta - Advanced crash  
│ • /xatanIos - iOS crash
│ • /xatanout - Other crash
│ • /checkcooldown - Check cooldown
│
├─────『 Information 』
│ • WhatsApp: ${isWhatsAppConnected ? '✅ Connected' : '❌ Disconnected'}
│ • Cooldown: ${bugCooldown}s
│ • Premium Required: ✅
│
╰═════════════════════⊱`;

    await ctx.editMessageText(menuMessage, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "🔙 Main Menu",
                    callback_data: "mainmenu"
                }]
            ]
        }
    });
});

bot.action('statusinfo', async (ctx) => {
    const statusMessage = `
╭═══════『 Status Info 』═══════⊱
│
├─────『 Connection 』
│ • WhatsApp: ${isWhatsAppConnected ? '✅ Connected' : '❌ Disconnected'}
│ • User: ${whatsappUserInfo?.name || 'N/A'}
│ • ID: ${whatsappUserInfo?.id || 'N/A'}
│
├─────『 System 』
│ • Premium Users: ${Object.keys(premiumUsers).length}
│ • Admin Users: ${adminList.length}
│ • Cooldown: ${bugCooldown}s
│ • Total Devices: ${deviceList.length}
│
╰═════════════════════⊱`;

    await ctx.editMessageText(statusMessage, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "🔙 Back",
                    callback_data: "bugmenu"
                }]
            ]
        }
    });
});

bot.action('connect_whatsapp', async (ctx) => {
    await ctx.editMessageText(`
╭═══════『 Connect WhatsApp 』═══════⊱
│
├─────『 Instructions 』
│ 1. Contact owner for pairing
│ 2. Use /addpairing command
│ 3. Need owner access
│
├─────『 Status 』  
│ • Current: ${isWhatsAppConnected ? '✅ Connected' : '❌ Disconnected'}
│
╰═════════════════════⊱`, {
        reply_markup: {
            inline_keyboard: [
                [{
                    text: "🔙 Main Menu",
                    callback_data: "mainmenu"
                }]
            ]
        }
    });
});

bot.action('mainmenu', async (ctx) => {
    await ctx.deleteMessage();
    await ctx.reply("Type /start to see main menu");
});

// Placeholder bug functions
const processResponse = async (target, ctx) => {
    await ctx.reply(`⚡ Starting attack on ${target}...`);
};

const doneResponse = async (target, ctx) => {
    await ctx.reply(`✅ Attack on ${target} completed!`);
};

const checkWhatsAppConnection = async (ctx, next) => {
    if (!isWhatsAppConnected) {
        await ctx.reply("❌ WhatsApp is not connected. Use /addpairing first.");
        return;
    }
    await next();
};

// Placeholder bug functions
async function OverloadCursor(target, ptcp = true) {
    console.log(`🔄 Sending bug to ${target}`);
    // Implement your bug logic here
    return true;
}

// Bug commands
bot.command("xatanCrash", checkWhatsAppConnection, checkPremium, async ctx => {
    const userId = ctx.from.id;
    const cooldownStatus = checkCooldown(userId);
    
    if (!cooldownStatus.canAttack) {
        return await ctx.reply(`⏳ Wait ${cooldownStatus.remainingTime} more seconds.`);
    }

    const args = ctx.message.text.split(/\s+/);
    if (args.length < 2) {
        return await ctx.reply("❌ Format: /xatanCrash 628xxxxxxxxxx [amount]");
    }

    let phoneNumber = args[1].replace(/[^0-9]/g, '');
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '62' + phoneNumber.slice(1);
    }
    if (!phoneNumber.startsWith('62')) {
        phoneNumber = '62' + phoneNumber;
    }

    const target = phoneNumber + "@s.whatsapp.net";

    await processResponse(target, ctx);
    userLastAttack.set(userId, Date.now());

    // Send bug
    await OverloadCursor(target, true);

    await doneResponse(target, ctx);
});

// Add other bug commands similarly...

// Error handling
bot.catch((err, ctx) => {
    console.error(`Error for ${ctx.updateType}:`, err);
});

// --- Run Bot ---
bot.launch().then(() => {
    console.log(chalk.green.bold('✅ Telegram bot is running...'));
}).catch(err => {
    console.error(chalk.red.bold('❌ Failed to start bot:'), err);
});

process.once('SIGINT', () => {
    console.log(chalk.yellow.bold('🛑 Shutting down bot...'));
    bot.stop('SIGINT');
    process.exit(0);
});

process.once('SIGTERM', () => {
    console.log(chalk.yellow.bold('🛑 Shutting down bot...'));
    bot.stop('SIGTERM');
    process.exit(0);
});
