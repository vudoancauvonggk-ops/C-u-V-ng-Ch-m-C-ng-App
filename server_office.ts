import express from 'express';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import dns from 'dns';
import https from 'https';

dns.setDefaultResultOrder('ipv4first');
import mammoth from 'mammoth';
import * as pdfParseModule from 'pdf-parse';
import fs from 'fs';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

class TelegramBotService {
  private token: string = '';
  private chatId: string = '';
  private verificationCode: string = '';
  private isPolling: boolean = false;
  private offset: number = 0;
  private logs: any[] = [];
  private pollTimeout: any = null;
  private botUsername: string = '';
  private botName: string = '';
  private emailService: EmailCheckerService | null = null;

  constructor() {
    this.loadConfig();
  }

  public setEmailService(service: EmailCheckerService) {
    this.emailService = service;
  }

  private loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data', 'telegram_config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.token = config.token || '';
        this.chatId = config.chatId || '';
        this.verificationCode = config.verificationCode || Math.floor(100000 + Math.random() * 900000).toString();
        this.logs = config.logs || [];
        this.botUsername = config.username || '';
        this.botName = config.botName || '';
      } else {
        this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        this.saveConfig();
      }
    } catch (err) {
      console.error('Error loading Telegram config:', err);
    }
  }

  private saveConfig() {
    try {
      const dirPath = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const configPath = path.join(dirPath, 'telegram_config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        token: this.token,
        chatId: this.chatId,
        username: this.botUsername,
        botName: this.botName,
        verificationCode: this.verificationCode,
        logs: this.logs.slice(-50)
      }, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving Telegram config:', err);
    }
  }

  public getStatus() {
    return {
      connected: !!this.chatId,
      hasToken: !!this.token,
      botUsername: this.botUsername,
      botName: this.botName,
      chatId: this.chatId,
      verificationCode: this.verificationCode,
      logs: this.logs
    };
  }

  public async setup(token: string) {
    this.token = token;
    this.chatId = '';
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.logs = [];
    this.botUsername = '';
    this.botName = '';
    this.addLog('Hệ thống', 'Cấu hình Token mới, đang kiểm tra thông tin Bot...');
    
    const info = await this.getBotInfo(token);
    if (info) {
      this.botUsername = info.username;
      this.botName = info.first_name;
      this.addLog('Hệ thống', `Đã kết nối với Bot: @${this.botUsername} (${this.botName})`);
      this.saveConfig();
      
      this.stopPolling();
      this.startPolling();
      return { success: true, botUsername: this.botUsername, botName: this.botName };
    } else {
      this.token = '';
      this.addLog('Lỗi', 'Token không hợp lệ hoặc không thể kết nối tới Telegram API.');
      this.saveConfig();
      return { success: false, error: 'Token không hợp lệ.' };
    }
  }

  public unlink() {
    this.chatId = '';
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.addLog('Hệ thống', 'Đã hủy liên kết với tài khoản Telegram.');
    this.saveConfig();
  }

  public addLog(sender: string, message: string) {
    this.logs.push({
      time: new Date().toLocaleTimeString('vi-VN'),
      sender,
      message
    });
    if (this.logs.length > 50) this.logs.shift();
    this.saveConfig();
  }

  private async telegramRequest(method: string, payload: any = null, tokenOverride?: string): Promise<any> {
    const activeToken = tokenOverride || this.token;
    if (!activeToken) return null;
    return new Promise((resolve) => {
      const dataStr = payload ? JSON.stringify(payload) : '';
      const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${activeToken}/${method}`,
        method: payload ? 'POST' : 'GET',
        headers: payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataStr)
        } : {},
        family: 4 // Force IPv4
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (_) {
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.error(`Telegram request error (${method}):`, e);
        resolve(null);
      });

      if (payload) {
        req.write(dataStr);
      }
      req.end();
    });
  }

  private async getBotInfo(token: string) {
    try {
      const data = await this.telegramRequest('getMe', null, token);
      if (data && data.ok) {
        return data.result;
      }
    } catch (e) {
      console.error('Error fetching getMe:', e);
    }
    return null;
  }

  public async sendMessage(message: string, chatOverride?: string) {
    const targetChat = chatOverride || this.chatId;
    if (!targetChat) return false;
    try {
      const data = await this.telegramRequest('sendMessage', {
        chat_id: targetChat,
        text: message,
        parse_mode: 'HTML'
      });
      return !!(data && data.ok);
    } catch (e) {
      console.error('Error sending message:', e);
      return false;
    }
  }

  public startPolling() {
    if (this.isPolling) return;
    if (!this.token) return;
    this.isPolling = true;
    this.offset = 0;
    this.poll();
  }

  public stopPolling() {
    this.isPolling = false;
    if (this.pollTimeout) {
      clearTimeout(this.pollTimeout);
      this.pollTimeout = null;
    }
  }

  private async poll() {
    if (!this.isPolling || !this.token) return;
    try {
      const data = await this.telegramRequest(`getUpdates?offset=${this.offset}&timeout=10`);
      if (data && data.ok && data.result.length > 0) {
        for (const update of data.result) {
          this.offset = update.update_id + 1;
          if (update.message) {
            await this.handleMessage(update.message);
          }
        }
      }
    } catch (e) {
      console.error('Telegram poll error:', e);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    if (this.isPolling) {
      this.pollTimeout = setTimeout(() => this.poll(), 1000);
    }
  }

  private async handleMessage(msg: any) {
    const text = msg.text ? msg.text.trim() : '';
    const chatId = msg.chat.id.toString();
    const fromUser = msg.from ? (msg.from.username ? `@${msg.from.username}` : msg.from.first_name) : 'Ẩn danh';

    this.addLog(fromUser, text);

    if (text.startsWith('/start')) {
      const welcome = `🤖 <b>Xin chào ${msg.from?.first_name || 'bạn'}!</b>\n\nTôi là bot điều khiển từ xa của ứng dụng Quản Lý Văn Phòng AI (Office Pro).\n\nĐể bắt đầu sử dụng, bạn hãy nhập mã liên kết từ giao diện Web bằng câu lệnh:\n<code>/link [mã_số]</code>\n\nVí dụ: <code>/link ${this.verificationCode}</code>`;
      await this.sendMessage(welcome, chatId);
      return;
    }

    if (text.startsWith('/link')) {
      const parts = text.split(/\s+/);
      const code = parts[1];
      if (code === this.verificationCode) {
        this.chatId = chatId;
        this.addLog('Hệ thống', `Tài khoản Telegram ${fromUser} (ChatID: ${chatId}) đã liên kết thành công.`);
        this.saveConfig();
        const successMsg = `✅ <b>Liên kết thành công!</b>\n\nTừ bây giờ bạn có thể nhận thông báo và điều khiển từ xa qua các lệnh:\n\n` +
          `• /status - Xem tổng quan tình hình văn phòng\n` +
          `• /tasks - Xem danh sách công việc hiện tại\n` +
          `• /addtask [nội dung] - Thêm nhanh công việc\n` +
          `• /contracts - Xem thống kê hợp đồng\n` +
          `• /alerts - Các báo cáo tuân thủ sắp đến hạn\n` +
          `• /checkmail - Quét email Thuế/BHXH mới lập tức\n` +
          `• /help - Xem lại hướng dẫn`;
        await this.sendMessage(successMsg, chatId);
      } else {
        await this.sendMessage(`❌ <b>Mã liên kết không đúng.</b> Vui lòng kiểm tra lại mã số trên giao diện Web.`, chatId);
      }
      return;
    }

    if (this.chatId && chatId !== this.chatId) {
      await this.sendMessage(`⚠️ <b>Từ chối truy cập!</b> Thiết bị này chưa được cấp quyền điều khiển từ xa.`, chatId);
      return;
    }

    if (!this.chatId) {
      await this.sendMessage(`⚠️ <b>Vui lòng liên kết trước!</b> Nhập lệnh <code>/link [mã_số]</code> để kết nối.`, chatId);
      return;
    }

    if (text === '/help') {
      const help = `🤖 <b>Các câu lệnh hỗ trợ điều khiển từ xa:</b>\n\n` +
        `• /status - Báo cáo tổng hợp tình trạng văn phòng\n` +
        `• /tasks - Hiển thị danh sách công việc chưa hoàn thành\n` +
        `• /addtask [nội dung] - Thêm nhanh công việc\n` +
        `• /contracts - Danh sách hợp đồng\n` +
        `• /alerts - Cảnh báo các báo cáo/thuế sắp đến hạn\n` +
        `• /checkmail - Quét kiểm tra email Thuế/BHXH mới ngay lập tức`;
      await this.sendMessage(help);
      return;
    }

    const state = this.loadOfficeState();

    if (text === '/status') {
      const totalContracts = state.contracts ? state.contracts.length : 0;
      const tasks = state.tasks || [];
      const pendingTasks = tasks.filter((t: any) => t.status !== 'done');
      const alerts = state.compliance || [];

      const statusMsg = `📊 <b>TÌNH TRẠNG VĂN PHÒNG HIỆN TẠI</b>\n\n` +
        `• <b>Hợp đồng:</b> ${totalContracts} hợp đồng đang được quản lý.\n` +
        `• <b>Công việc tồn đọng:</b> ${pendingTasks.length}/${tasks.length} nhiệm vụ.\n` +
        `• <b>Cảnh báo tuân thủ:</b> ${alerts.length} báo cáo sắp đến hạn.\n\n` +
        `<i>Sử dụng các lệnh /tasks, /contracts, /alerts hoặc /checkmail để xem chi tiết.</i>`;
      await this.sendMessage(statusMsg);
      return;
    }

    if (text === '/tasks') {
      const tasks = state.tasks || [];
      const pendingTasks = tasks.filter((t: any) => t.status !== 'done');
      if (pendingTasks.length === 0) {
        await this.sendMessage(`✅ <b>Không có công việc nào đang tồn đọng.</b>`);
      } else {
        let list = `📝 <b>DANH SÁCH CÔNG VIỆC CHƯA HOÀN THÀNH:</b>\n\n`;
        pendingTasks.slice(0, 10).forEach((t: any, idx: number) => {
          list += `${idx + 1}. [Hạn: ${t.deadline || 'Chưa rõ'}] <b>${t.title}</b> (Người làm: ${t.assignee || 'Chưa phân công'})\n`;
        });
        if (pendingTasks.length > 10) {
          list += `<i>...và ${pendingTasks.length - 10} công việc khác. Xem chi tiết trên Web.</i>`;
        }
        await this.sendMessage(list);
      }
      return;
    }

    if (text.startsWith('/addtask')) {
      const parts = text.split(/\s+/);
      const title = text.substring(parts[0].length).trim();
      if (!title) {
        await this.sendMessage(`⚠️ Vui lòng nhập nội dung công việc. Cú pháp: <code>/addtask [nội dung]</code>`);
        return;
      }
      
      const newTask = {
        id: 'tele-' + Date.now(),
        title,
        status: 'pending',
        assignee: 'Telegram Remote',
        deadline: 'Hôm nay',
        source: 'Telegram',
        dateCreated: new Date().toLocaleDateString('vi-VN')
      };
      
      state.tasks = state.tasks || [];
      state.tasks.push(newTask);
      this.saveOfficeState(state);

      await this.sendMessage(`✅ <b>Đã thêm công việc thành công!</b>\n\n<b>Nội dung:</b> ${title}\n<b>Người nhận:</b> Telegram Remote\n<i>Hệ thống sẽ đồng bộ về Web UI ngay lập tức.</i>`);
      return;
    }

    if (text === '/contracts') {
      const contracts = state.contracts || [];
      if (contracts.length === 0) {
        await this.sendMessage(`📂 <b>Chưa có hợp đồng nào trong hệ thống.</b>`);
      } else {
        let list = `📄 <b>TỔNG QUAN HỢP ĐỒNG:</b>\n`;
        list += `• Tổng số hợp đồng: <b>${contracts.length}</b>\n\n`;
        contracts.slice(0, 5).forEach((c: any, idx: number) => {
          list += `${idx + 1}. <b>${c.title}</b>\nĐối tác: ${c.partner || 'Khách lẻ'} | Trạng thái: ${c.status || 'Đang hiệu lực'}\n`;
        });
        if (contracts.length > 5) {
          list += `<i>...và ${contracts.length - 5} hợp đồng khác. Xem trên Web.</i>`;
        }
        await this.sendMessage(list);
      }
      return;
    }

    if (text === '/alerts') {
      const alerts = state.compliance || [];
      if (alerts.length === 0) {
        await this.sendMessage(`✅ <b>Không có cảnh báo tuân thủ nào sắp đến hạn (Dưới 30 ngày).</b>`);
      } else {
        let list = `⚠️ <b>CẢNH BÁO BÁO CÁO SẮP ĐẾN HẠN:</b>\n\n`;
        alerts.forEach((alert: any, idx: number) => {
          list += `${idx + 1}. [${alert.area}] <b>${alert.title}</b>\nHạn nộp: <b>${alert.deadline}</b> (Còn ${alert.daysLeft} ngày)\n\n`;
        });
        await this.sendMessage(list);
      }
      return;
    }

    if (text === '/checkmail' || text === '/check') {
      if (!this.emailService) {
        await this.sendMessage(`⚠️ <b>Dịch vụ Email chưa được khởi tạo.</b>`);
        return;
      }
      if (!this.emailService.hasCredentials()) {
        await this.sendMessage(`⚠️ <b>Dịch vụ Email chưa được cấu hình.</b> Vui lòng nhập địa chỉ Email và Mật khẩu ứng dụng trên giao diện Web.`);
        return;
      }

      await this.sendMessage(`🔍 <b>Đang kết nối và kiểm tra hộp thư mới...</b>\nVui lòng đợi trong giây lát.`);
      try {
        const count = await this.emailService.checkEmails();
        if (count > 0) {
          await this.sendMessage(`✅ <b>Kiểm tra hoàn tất!</b>\nĐã quét và phát hiện thêm <b>${count}</b> email quan trọng mới.`);
        } else {
          await this.sendMessage(`✅ <b>Kiểm tra hoàn tất!</b>\nKhông phát hiện email mới nào liên quan đến <b>Thuế</b> hoặc <b>BHXH</b>.`);
        }
      } catch (err: any) {
        await this.sendMessage(`❌ <b>Lỗi khi quét email:</b> ${err.message || 'Không rõ nguyên nhân'}`);
      }
      return;
    }

    const reply = await this.askGemini(text, state);
    await this.sendMessage(reply);
  }

  private async askGemini(userMessage: string, state: any) {
    if (!process.env.GEMINI_API_KEY) {
      return "⚠️ <b>Lỗi:</b> Chưa cấu hình <code>GEMINI_API_KEY</code> trên hệ thống nên tôi chưa thể trả lời thông minh được.";
    }
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `
Bạn là "Trợ Lý Văn Phòng Kim" (Office Pro AI Assistant), một trợ lý AI thông minh tích hợp vào hệ thống quản lý văn phòng của người dùng.
Bạn đang giao tiếp với quản trị viên qua Telegram để giúp họ điều khiển và nắm bắt tình hình văn phòng từ xa.

Dữ liệu văn phòng hiện tại:
- Hợp đồng: ${JSON.stringify(state.contracts || [])}
- Công việc: ${JSON.stringify(state.tasks || [])}
- Cảnh báo tuân thủ/báo cáo: ${JSON.stringify(state.compliance || [])}

Hãy trả lời câu hỏi của người dùng một cách thông minh, tự nhiên, và hữu ích.
Chỉ sử dụng các thẻ HTML cơ bản sau để định dạng tin nhắn cho Telegram:
- <b>chữ đậm</b> hoặc <strong>chữ đậm</strong>
- <i>chữ nghiêng</i> hoặc <em>chữ nghiêng</em>
- <code>mã code</code>
- <pre>khối mã code</pre>
- <a href="đường-dẫn">liên kết</a>
Tránh dùng các thẻ khác kẻo Telegram báo lỗi định dạng. Trả lời ngắn gọn, trực quan phù hợp với giao diện chat di động.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\nNgười dùng hỏi: "${userMessage}"` }] }
        ]
      });

      return response.text || "🤖 Tôi không thể đưa ra phản hồi lúc này.";
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      return `❌ <b>Lỗi khi xử lý AI:</b> ${error.message || 'Không rõ nguyên nhân'}`;
    }
  }

  public loadOfficeState() {
    try {
      const statePath = path.join(process.cwd(), 'data', 'office_state.json');
      if (fs.existsSync(statePath)) {
        return JSON.parse(fs.readFileSync(statePath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading office state:', e);
    }
    return { contracts: [], tasks: [], compliance: [] };
  }

  public saveOfficeState(state: any) {
    try {
      const statePath = path.join(process.cwd(), 'data', 'office_state.json');
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving office state:', e);
    }
  }
}

class EmailCheckerService {
  private config: any = {};
  private checkInterval: any = null;
  private botService: TelegramBotService;

  constructor(botService: TelegramBotService) {
    this.botService = botService;
    this.loadConfig();
  }

  public loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'data', 'email_config.json');
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        this.config = {
          email: "",
          password: "",
          host: "imap.gmail.com",
          port: 993,
          tls: true,
          lastCheckedUid: 1,
          scanTax: true,
          scanBhxh: true,
          reportNoon: true,
          reportNight: true
        };
        this.saveConfig();
      }
    } catch (err) {
      console.error('Error loading email config:', err);
    }
  }

  public saveConfig() {
    try {
      const dirPath = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      const configPath = path.join(dirPath, 'email_config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving email config:', err);
    }
  }

  public getConfig() {
    return {
      ...this.config,
      password: this.config.password ? '••••••••••••' : ''
    };
  }

  public async setup(newConfig: any) {
    this.config = {
      ...this.config,
      ...newConfig
    };
    if (newConfig.password === '••••••••••••' || !newConfig.password) {
      const oldConfigPath = path.join(process.cwd(), 'data', 'email_config.json');
      if (fs.existsSync(oldConfigPath)) {
        const old = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
        this.config.password = old.password || '';
      }
    }
    this.saveConfig();
    this.restartService();
  }

  public restartService() {
    this.stopChecking();
    this.startChecking();
  }

  public startChecking() {
    if (this.checkInterval) return;
    if (!this.config.email || !this.config.password) {
      console.log('Email checker service not started: configuration incomplete.');
      return;
    }
    
    console.log('Email checker service started.');
    this.checkEmails().catch(err => console.error('Initial email check failed:', err));
    this.checkInterval = setInterval(() => {
      this.checkEmails().catch(err => console.error('Interval email check failed:', err));
    }, 10 * 60 * 1000); // 10 minutes
  }

  public stopChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('Email checker service stopped.');
  }

  public async testConnection(testConfig: any) {
    let password = testConfig.password;
    if (password === '••••••••••••' || !password) {
      const oldConfigPath = path.join(process.cwd(), 'data', 'email_config.json');
      if (fs.existsSync(oldConfigPath)) {
        const old = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
        password = old.password || '';
      }
    }

    const client = new ImapFlow({
      host: testConfig.host || 'imap.gmail.com',
      port: parseInt(testConfig.port) || 993,
      secure: testConfig.tls !== false,
      auth: {
        user: testConfig.email,
        pass: password
      },
      logger: false
    });

    try {
      await client.connect();
      await client.logout();
      return { success: true };
    } catch (err: any) {
      console.error('Email connection test failed:', err);
      return { success: false, error: err.message || 'Không thể kết nối. Kiểm tra lại email/mật khẩu ứng dụng.' };
    }
  }

  public hasCredentials(): boolean {
    return !!(this.config.email && this.config.password);
  }

  public async checkEmails(): Promise<number> {
    if (!this.config.email || !this.config.password) return 0;

    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.tls,
      auth: {
        user: this.config.email,
        pass: this.config.password
      },
      logger: false
    });

    let foundCount = 0;
    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        const status = await client.status('INBOX', { uidNext: true });
        const nextUid = status.uidNext || 1;
        const lastCheckedUid = this.config.lastCheckedUid || 1;

        if (nextUid > lastCheckedUid) {
          const query = `${lastCheckedUid}:*`;
          for await (const message of client.fetch(query, { uid: true, source: true })) {
            const uid = message.uid;
            if (uid < lastCheckedUid) continue;

            const parsed = await simpleParser(message.source);
            const subject = parsed.subject || '(Không có tiêu đề)';
            const from = parsed.from ? parsed.from.text : '(Không rõ người gửi)';
            const textContent = parsed.text || parsed.html || '';
            const date = parsed.date || new Date();

            const combinedText = `${subject} ${textContent}`.toLowerCase();
            let isTax = false;
            let isBhxh = false;

            if (this.config.scanTax) {
              const taxKeywords = ['thuế', 'thue', 'tờ khai', 'to khai', 'cơ quan thuế', 'chi cục thuế', 'gdt.gov.vn'];
              isTax = taxKeywords.some(kw => combinedText.includes(kw));
            }

            if (this.config.scanBhxh) {
              const bhxhKeywords = ['bảo hiểm xã hội', 'bao hiem xa hoi', 'bhxh', 'gddt.baohiemxahoi.gov.vn'];
              isBhxh = bhxhKeywords.some(kw => combinedText.includes(kw));
            }

            if (isTax || isBhxh) {
              foundCount++;
              this.saveToDailyEmails({
                uid,
                from,
                subject,
                date: date.toLocaleString('vi-VN'),
                category: isTax && isBhxh ? 'Thuế & BHXH' : isTax ? 'Thuế' : 'BHXH',
                snippet: textContent.substring(0, 500)
              });

              const alertMsg = `🔔 <b>CẢNH BÁO THƯ MỚI QUAN TRỌNG!</b>\n\n` +
                `• <b>Phân loại:</b> ${isTax && isBhxh ? 'Thuế & BHXH' : isTax ? 'Thuế' : 'BHXH'}\n` +
                `• <b>Người gửi:</b> <code>${from}</code>\n` +
                `• <b>Tiêu đề:</b> <i>${subject}</i>\n` +
                `• <b>Thời gian:</b> ${date.toLocaleString('vi-VN')}\n\n` +
                `<b>Tóm tắt nhanh nội dung:</b>\n` +
                `${textContent.substring(0, 200).trim()}...`;
              await this.botService.sendMessage(alertMsg);
              this.botService.addLog('Email Scanner', `Phát hiện email quan trọng: "${subject}" từ ${from}`);
            }
          }
          this.config.lastCheckedUid = nextUid;
          this.saveConfig();
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (err) {
      console.error('Error during email check execution:', err);
      throw err;
    }
    return foundCount;
  }

  private saveToDailyEmails(emailInfo: any) {
    try {
      const dailyPath = path.join(process.cwd(), 'data', 'daily_emails.json');
      let emails: any[] = [];
      if (fs.existsSync(dailyPath)) {
        emails = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
      }
      if (!emails.some(e => e.uid === emailInfo.uid)) {
        emails.push(emailInfo);
      }
      fs.writeFileSync(dailyPath, JSON.stringify(emails, null, 2), 'utf8');
    } catch (e) {
      console.error('Error saving daily emails:', e);
    }
  }

  public getDailyEmails() {
    try {
      const dailyPath = path.join(process.cwd(), 'data', 'daily_emails.json');
      if (fs.existsSync(dailyPath)) {
        return JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error getting daily emails:', e);
    }
    return [];
  }

  public clearDailyEmails() {
    try {
      const dailyPath = path.join(process.cwd(), 'data', 'daily_emails.json');
      if (fs.existsSync(dailyPath)) {
        fs.writeFileSync(dailyPath, '[]', 'utf8');
      }
    } catch (e) {
      console.error('Error clearing daily emails:', e);
    }
  }

  public startScheduler() {
    setInterval(async () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (this.config.reportNoon && hours === 12 && minutes === 0) {
        await this.sendDailySummaryReport('Trưa');
      }
      
      if (this.config.reportNight && hours === 21 && minutes === 0) {
        await this.sendDailySummaryReport('Tối');
      }
    }, 60000);
  }

  public async sendDailySummaryReport(sessionName: string) {
    const emails = this.getDailyEmails();
    if (emails.length === 0) {
      await this.botService.sendMessage(`📊 <b>BÁO CÁO TÓM TẮT THƯ ĐÃ NHẬN (${sessionName})</b>\n\nKhông nhận được thư quan trọng nào liên quan tới Thuế hay BHXH trong buổi.`);
      return;
    }

    this.botService.addLog('Hệ thống', `Đang lập báo cáo tóm tắt email buổi ${sessionName} bằng AI...`);

    let emailListText = '';
    emails.forEach((e: any, idx: number) => {
      emailListText += `[Thư ${idx + 1}] Phân loại: ${e.category} | Từ: ${e.from} | Tiêu đề: ${e.subject} | Nội dung: ${e.snippet}\n---\n`;
    });

    let summaryText = '';
    if (process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const systemInstruction = `
Bạn là "Trợ Lý Văn Phòng Kim" (Office Pro AI Assistant).
Hãy viết báo cáo tóm tắt các email quan trọng liên quan đến Thuế và Bảo hiểm xã hội mà văn phòng đã nhận được trong ngày.

Dưới đây là danh sách các email:
${emailListText}

Yêu cầu định dạng báo cáo gửi qua Telegram:
1. Tiêu đề nổi bật: 📊 <b>BÁO CÁO TÓM TẮT THƯ ĐÃ NHẬN (Buổi ${sessionName})</b>
2. Liệt kê từng thư, ghi rõ Tiêu đề, Người gửi, và tóm tắt ngắn gọn 2-3 câu các ý chính hoặc hành động cần làm (Ví dụ: nộp tờ khai trước ngày X, thông báo thuế phạt, v.v.).
3. Định dạng bằng HTML của Telegram (dùng <b>, <i>, <code>). Tránh dùng các tag HTML không được hỗ trợ hoặc markdown.
4. Trình bày sạch sẽ, chuyên nghiệp, dễ đọc trên di động.
`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            { role: 'user', parts: [{ text: systemInstruction }] }
          ]
        });
        summaryText = response.text || '';
      } catch (err: any) {
        console.error('Gemini error generating email summary report:', err);
        summaryText = `❌ <i>Lỗi AI khi sinh tóm tắt: ${err.message}</i>\n\n`;
      }
    }

    if (!summaryText) {
      summaryText = `📊 <b>BÁO CÁO TÓM TẮT THƯ ĐÃ NHẬN (${sessionName})</b>\n\n`;
      emails.forEach((e: any, idx: number) => {
        summaryText += `${idx + 1}. [${e.category}] <b>${e.subject}</b>\n• Người gửi: ${e.from}\n• Nội dung: ${e.snippet.substring(0, 150)}...\n\n`;
      });
    }

    await this.botService.sendMessage(summaryText);
    this.botService.addLog('Hệ thống', `Đã gửi báo cáo tóm tắt email buổi ${sessionName} tới Telegram.`);
    this.clearDailyEmails();
  }
}

export const officeRouter = express.Router();
const app = officeRouter;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const botService = new TelegramBotService();
  // Comment out polling to prevent conflict with the standalone bot
  // botService.startPolling();

  app.get('/api/telegram/status', (req, res) => {
    res.json(botService.getStatus());
  });

  app.post('/api/telegram/setup', async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    const result = await botService.setup(token);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  app.post('/api/telegram/unlink', (req, res) => {
    botService.unlink();
    res.json({ success: true });
  });

  app.post('/api/telegram/send-test', async (req, res) => {
    const success = await botService.sendMessage('🔔 <b>Tin nhắn thử nghiệm:</b> Kết nối điều khiển từ xa hoạt động tốt!');
    if (success) {
      botService.addLog('Hệ thống', 'Đã gửi thành công tin nhắn thử nghiệm tới Telegram.');
      res.json({ success: true });
    } else {
      botService.addLog('Hệ thống', 'Gửi tin nhắn thử nghiệm thất bại (Chat ID có thể chưa được liên kết).');
      res.status(400).json({ error: 'Gửi tin nhắn thất bại. Hãy chắc chắn bạn đã nhấn /start và gửi mã liên kết cho Bot trên Telegram.' });
    }
  });

  app.post('/api/telegram/sync', (req, res) => {
    const { contracts, tasks, compliance } = req.body;
    const currentState = botService.loadOfficeState() as any;
    
    let telegramContractsToSyncDown: any[] = [];
    let telegramComplianceToSyncDown: any = null;
    
    // Sync contracts
    if (contracts && contracts.length > 0) {
      currentState.contracts = contracts;
    } else if (currentState.contracts && currentState.contracts.length > 0) {
      telegramContractsToSyncDown = currentState.contracts;
    }
    
    // Sync compliance
    if (compliance && compliance.length > 0) {
      currentState.compliance = compliance;
    } else if (currentState.compliance && currentState.compliance.length > 0) {
      telegramComplianceToSyncDown = currentState.compliance;
    }
    
    const clientTasks = tasks || [];
    const mergedTasks = [...clientTasks];
    const clientTaskIds = new Set(clientTasks.map((t: any) => t.id));
    const telegramTasksToSyncDown: any[] = [];
    
    if (currentState.tasks && Array.isArray(currentState.tasks)) {
      for (const t of currentState.tasks) {
        if (!clientTaskIds.has(t.id)) {
          mergedTasks.push(t);
          telegramTasksToSyncDown.push(t);
        } else {
          const clientTask = clientTasks.find((ct: any) => ct.id === t.id);
          if (clientTask) {
            t.status = clientTask.status;
            t.assignee = clientTask.assignee;
            t.deadline = clientTask.deadline;
          }
        }
      }
    }
    
    currentState.tasks = mergedTasks;
    botService.saveOfficeState(currentState);
    
    res.json({
      success: true,
      telegramTasks: telegramTasksToSyncDown,
      telegramContracts: telegramContractsToSyncDown,
      telegramCompliance: telegramComplianceToSyncDown,
      allTasks: mergedTasks
    });
  });

  const emailService = new EmailCheckerService(botService);
  botService.setEmailService(emailService);
  emailService.startChecking();
  emailService.startScheduler();

  app.get('/api/email/config', (req, res) => {
    res.json(emailService.getConfig());
  });

  app.post('/api/email/setup', async (req, res) => {
    try {
      await emailService.setup(req.body);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Lỗi lưu cấu hình' });
    }
  });

  app.post('/api/email/test-connection', async (req, res) => {
    const result = await emailService.testConnection(req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  });

  app.post('/api/analyze-contract', upload.single('file'), async (req, res) => {
    try {
      let fileBuffer: Buffer;
      let originalname: string;
      let mimeType: string;

      if (req.file) {
        fileBuffer = req.file.buffer;
        originalname = req.file.originalname.toLowerCase();
        mimeType = req.file.mimetype;
      } else if (req.body && req.body.fileBase64) {
        let base64Data = req.body.fileBase64;
        if (base64Data.includes(';base64,')) {
          const parts = base64Data.split(';base64,');
          mimeType = parts[0].replace('data:', '');
          base64Data = parts[1];
        } else {
          mimeType = req.body.mimeType || 'application/octet-stream';
        }
        fileBuffer = Buffer.from(base64Data, 'base64');
        originalname = (req.body.fileName || 'document').toLowerCase();
      } else {
        return res.status(400).json({ error: 'Không nhận được dữ liệu file từ trình duyệt. Vui lòng thử lại.' });
      }

      if (fileBuffer.length === 0) {
        return res.status(400).json({ error: 'File tải lên trống (0 bytes). Nếu file đang mở trong ứng dụng khác (như Word), hãy đóng nó lại và thử tải lên.' });
      }

      let data: any = null;

      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenAI } = await import('@google/genai');
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          let parts: any[] = [];
          
          const prompt = `
Hãy đóng vai trò là một chuyên gia pháp lý và kế toán. Hãy phân tích tài liệu/hợp đồng được tải lên và trích xuất các thông tin chi tiết dưới dạng JSON.

Yêu cầu trích xuất cấu trúc JSON:
{
  "contractNumber": "Số hợp đồng hoặc số quyết định (nếu không có, tự sinh theo định dạng HD-YYYY-XXX)",
  "title": "Tiêu đề hợp đồng hoặc tên tài liệu (viết hoa, ngắn gọn, tối đa 150 ký tự)",
  "partner": "Tên đối tác hoặc bên liên quan (Bên B hoặc đối tác chính trong tài liệu, mặc định 'Chưa xác định')",
  "taxCode": "Mã số thuế của đối tác hoặc bên liên quan (nếu có, nếu không thì ghi 'Chưa cập nhật')",
  "startDate": "Ngày ký hoặc ngày bắt đầu hiệu lực (định dạng DD/MM/YYYY)",
  "date": "Ngày hết hạn (định dạng DD/MM/YYYY, nếu không ghi rõ thời hạn, mặc định là cộng thêm 1 năm kể từ ngày bắt đầu)",
  "status": "Trạng thái hợp đồng (luôn ghi 'Đang hiệu lực')",
  "content": "Tóm tắt ngắn gọn nội dung tài liệu (khoảng 3-4 câu chính)",
  "alerts": [
    {
      "type": "warning",
      "title": "Lưu ý quan trọng từ tài liệu này",
      "description": "Mô tả chi tiết lưu ý hoặc nghĩa vụ cần thực hiện (ví dụ: ngày thanh toán, phạt vi phạm, điều khoản đặc biệt)"
    }
  ]
}

Chú ý: Chỉ trả về duy nhất chuỗi JSON hợp lệ, không nằm trong khối mã markdown (không dùng \`\`\`json).
`;

          parts.push({ text: prompt });

          const isDocx = mimeType.includes('wordprocessingml') || originalname.endsWith('.docx');
          
          if (isDocx) {
            const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
            parts.push({ text: `Nội dung văn bản: ${docxResult.value}` });
          } else {
            let resolvedMimeType = mimeType;
            if (resolvedMimeType === 'application/octet-stream') {
              if (originalname.endsWith('.pdf')) resolvedMimeType = 'application/pdf';
              else if (originalname.endsWith('.png')) resolvedMimeType = 'image/png';
              else if (originalname.endsWith('.jpg') || originalname.endsWith('.jpeg')) resolvedMimeType = 'image/jpeg';
              else if (originalname.endsWith('.txt')) resolvedMimeType = 'text/plain';
            }

            parts.push({
              inlineData: {
                mimeType: resolvedMimeType,
                data: fileBuffer.toString('base64')
              }
            });
          }

          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              { role: 'user', parts }
            ]
          });

          let textResponse = response.text || '';
          textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          
          data = JSON.parse(textResponse);
        } catch (err) {
          console.error('Gemini contract analysis failed, falling back to local parsing:', err);
        }
      }

      if (!data) {
        // Fallback local parsing
        let textContent = '';

        if (mimeType === 'application/pdf') {
          const pdfData = await pdfParse(fileBuffer);
          textContent = pdfData.text;
        } else if (mimeType.includes('wordprocessingml') || originalname.endsWith('.docx')) {
          try {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            if (!result.value.trim()) {
              throw new Error('File DOCX rỗng hoặc không có chữ.');
            }
            textContent = result.value;
          } catch (err: any) {
            console.error('Lỗi khi đọc DOCX:', err);
            throw new Error('Không thể đọc file DOCX. File có thể bị lỗi, vui lòng lưu lại thành PDF rồi thử lại.');
          }
        } else if (mimeType.startsWith('text/')) {
          textContent = fileBuffer.toString('utf-8');
        } else {
          const mockData = {
            contractNumber: `HD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            title: originalname,
            partner: 'Công ty Đối Tác Giả Lập (Không đọc được file)',
            startDate: new Date().toLocaleDateString('vi-VN'),
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN'),
            status: 'Đang hiệu lực',
            alerts: [
              {
                type: 'warning',
                title: 'Không thể trích xuất văn bản',
                description: 'Định dạng file không hỗ trợ đọc text trực tiếp. Dữ liệu này là dữ liệu mẫu.'
              }
            ]
          };
          return res.json(mockData);
        }

        textContent = textContent.normalize('NFC');
        let normalizedLinesText = textContent.replace(/\r\n|\r/g, '\n');
        normalizedLinesText = normalizedLinesText.replace(/[^\S\r\n]+/g, ' ');
        normalizedLinesText = normalizedLinesText.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');

        let contractNumberMatch = normalizedLinesText.match(/^[^\S\n]*(?:Số|Số hợp đồng)[\s:.\-]*([0-9A-Za-z]+[\/\-][0-9A-Za-zĐđ\/\-_]+)/im);
        if (!contractNumberMatch) {
           contractNumberMatch = normalizedLinesText.match(/^[^\S\n]*(?:Số|Số hợp đồng)\s*:\s*([^\n\r]+)/im);
        }
        
        const inlineTitleMatch = normalizedLinesText.match(/k[ýí]\s+kết\s+(Hợp\s+[đd]ồng[^\n]+?)(?:\s+với\s+các|\s+như\s+sau|\s*:|\s+sau\s+đây)/i);
        const blockTitleMatch = normalizedLinesText.match(/HỢP\s+ĐỒNG[^\n]*(?:\n(?!(?:Số|Căn|Hôm|Tại|Bên|Cộng|Mã|V\/v|Điều|Đại diện))[^\n]+){0,3}/i);
        
        let title = originalname;
        if (inlineTitleMatch) {
           title = inlineTitleMatch[1].trim().toUpperCase();
        } else if (blockTitleMatch) {
           title = blockTitleMatch[0].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
        }
        title = title.substring(0, 150);
        
        let partner = 'Chưa xác định';
        const partnerMatch = normalizedLinesText.match(/BÊN B\s*(?:\(.*\))?:\s*([^\n]+)/i) || normalizedLinesText.match(/Bên (?:mua|thuê|nhận|sử dụng|vay)\s*:\s*([^\n]+)/i);
        if (partnerMatch) partner = partnerMatch[1].trim();

        const taxCodeMatches = [...normalizedLinesText.matchAll(/(?:Mã\s*số\s*thuế|MST|Mã\s*thuế)[^\d\n]{0,30}?([\d\s\-]{10,20})/ig)];
        let taxCode = 'Chưa cập nhật';
        if (taxCodeMatches.length > 0) {
          for (let i = taxCodeMatches.length - 1; i >= 0; i--) {
            const digits = taxCodeMatches[i][1].replace(/[^\d]/g, '');
            if (digits.length >= 10 && digits.length <= 14) {
              taxCode = digits;
              break;
            }
          }
        }

        const dateRegex = /Ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i;
        const dateMatches = [...normalizedLinesText.matchAll(new RegExp(dateRegex, 'gi'))];
        
        let startDate = '---';
        let endDate = '---';
        let status = 'Đang hiệu lực';

        if (dateMatches.length > 0) {
          const m = dateMatches[0];
          startDate = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
        } else {
          startDate = new Date().toLocaleDateString('vi-VN');
        }

        if (startDate !== '---') {
          const parts = startDate.split('/');
          if (parts.length === 3) {
             endDate = `${parts[0]}/${parts[1]}/${parseInt(parts[2]) + 1}`;
          }
        }

        data = {
          contractNumber: contractNumberMatch ? contractNumberMatch[1].trim().substring(0, 50) : `HD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          title: title,
          partner: partner,
          taxCode: taxCode,
          startDate: startDate,
          date: endDate,
          status: status,
          alerts: [
            {
               type: 'warning',
               title: 'Phân tích cục bộ',
               description: 'Hợp đồng được đọc bằng công cụ phân tích cục bộ (không dùng AI). Hãy kiểm tra lại thông tin.'
            }
          ]
        };
      }

      res.json(data);
    } catch (error: any) {
      console.error('Error analyzing contract locally:', error);
      res.status(500).json({ error: error.message || 'Lỗi xử lý file cục bộ' });
    }
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUser && password === adminPass) {
      res.json({ success: true, token: 'session_token_placeholder' });
    } else {
      res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không chính xác' });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const { message, history, contracts, tasks, compliance } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY.' });
    }
    
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const serverState = botService.loadOfficeState() as any;
      const finalContracts = (contracts && Array.isArray(contracts)) ? contracts : (serverState.contracts || []);
      const finalTasks = (tasks && Array.isArray(tasks)) ? tasks : (serverState.tasks || []);
      const finalCompliance = compliance ? compliance : (serverState.compliance || []);
      
      const systemInstruction = `
Bạn là "Trợ Lý Văn Phòng Kim" (Kim Office AI Assistant), một trợ lý ảo thông minh chạy trực tiếp trên giao diện web của quản trị viên.
Nhiệm vụ của bạn là hỗ trợ admin tìm kiếm thông tin, tra cứu dữ liệu văn phòng, hướng dẫn sử dụng app, soạn thảo nhanh hoặc nhắc nhở công việc.

Dữ liệu văn phòng hiện tại trên hệ thống:
- Hợp đồng: ${JSON.stringify(finalContracts)}
- Công việc (Tasks): ${JSON.stringify(finalTasks)}
- Cảnh báo tuân thủ (Compliance): ${JSON.stringify(finalCompliance)}

Hãy trả lời một cách thân thiện, chuyên nghiệp, ngắn gọn và hữu ích bằng tiếng Việt. Bạn có thể sử dụng markdown để định dạng câu trả lời đẹp mắt.
`;

      const contents: any[] = [];
      if (history && Array.isArray(history)) {
        for (const h of history) {
          contents.push({
            role: h.role, // 'user' or 'model'
            parts: [{ text: h.text }]
          });
        }
      }
      
      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nYêu cầu từ admin: "${message}"` }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents
      });

      res.json({ text: response.text || 'Tôi chưa tìm thấy câu trả lời.' });
    } catch (err: any) {
      console.error('Chat AI failed:', err);
      res.status(500).json({ error: err.message || 'Lỗi xử lý AI' });
    }
  });

  app.get('/api/ai-updates', async (req, res) => {
    const cacheFile = path.join(process.cwd(), 'data', 'ai_updates.json');
    const forceRefresh = req.query.force === 'true';
    
    const isCacheValid = (mtime: Date) => {
      const diffMs = Date.now() - mtime.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays < 7; // Valid for 7 days
    };
    
    try {
      const dataDir = path.dirname(cacheFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      if (fs.existsSync(cacheFile) && !forceRefresh) {
        const stats = fs.statSync(cacheFile);
        if (isCacheValid(stats.mtime)) {
          const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          return res.json(cachedData);
        }
      }
      
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not configured.');
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `
Bạn là một chuyên gia luật pháp và tài chính doanh nghiệp tại Việt Nam.
Hãy tìm kiếm trên Google (sử dụng tính năng tìm kiếm tích hợp) các chính sách thuế, quy định lao động, bảo hiểm xã hội mới nhất (cập nhật mới nhất đến năm 2026) đang hoặc sắp áp dụng cho các doanh nghiệp nhỏ và siêu nhỏ (dưới 20 nhân sự) tại Việt Nam.

Yêu cầu định dạng kết quả trả về dưới dạng JSON thô duy nhất (không bọc trong dấu nháy \`\`\`json ... \`\`\`), khớp chính xác với cấu trúc sau:
{
  "lastUpdated": "Ngày tháng năm hiện tại",
  "groups": [
    {
      "title": "Tên nhóm (ví dụ: Chính sách Thuế mới, Quy định Lao động & Bảo hiểm)",
      "items": [
        {
          "id": "chuỗi_id_duy_nhất_viết_liền_không_dấu",
          "title": "Tên điểm lưu ý ngắn gọn (ví dụ: 1. Thuế suất TNDN ưu đãi...)",
          "content": "Nội dung tóm tắt chi tiết, dễ hiểu, ghi rõ các mức phần trăm hoặc số liệu cụ thể.",
          "effectiveDate": "Hiệu lực (ví dụ: Từ ngày 01/07/2026 hoặc Nghị định/Thông tư số...)",
          "action": "Hành động khuyến nghị cho doanh nghiệp (ví dụ: Kế toán cần chuẩn bị gì...)"
        }
      ]
    }
  ]
}

Chú ý: Chỉ trả về chuỗi JSON thô, không thêm bất kỳ văn bản giải thích nào khác ở trước hay sau.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });

      let responseText = response.text || '';
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      const parsedData = JSON.parse(responseText);
      fs.writeFileSync(cacheFile, JSON.stringify(parsedData, null, 2), 'utf8');
      res.json(parsedData);
    } catch (err: any) {
      console.error('Failed to update AI updates:', err);
      if (fs.existsSync(cacheFile)) {
        try {
          const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
          return res.json(cachedData);
        } catch (_) {}
      }
      
      res.json({
        lastUpdated: new Date().toLocaleDateString('vi-VN'),
        groups: [
          {
            title: "Chính sách Thuế mới (Cập nhật mặc định)",
            items: [
              {
                id: "thue_tndn_default",
                title: "1. Thuế suất TNDN ưu đãi (15% - 17%) & Miễn thuế 3 năm",
                content: "Áp dụng mức thuế 15% với DN doanh thu dưới 3 tỷ; 17% với DN doanh thu từ 3-50 tỷ. Miễn thuế 3 năm cho DN chuyển đổi từ hộ kinh doanh.",
                effectiveDate: "Hiệu lực từ 07/2026",
                action: "Kế toán kiểm tra doanh thu để áp dụng mức thuế suất ưu đãi chính xác khi khai quyết toán."
              }
            ]
          }
        ]
      });
    }
  });

  // Serve uploads folder statically
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Multer disk storage for candidates
  const candidateStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), 'uploads', 'candidates');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'cv-' + uniqueSuffix + ext);
    }
  });
  const uploadCandidate = multer({ storage: candidateStorage });

  app.post('/api/apply', uploadCandidate.any(), async (req, res) => {
    try {
      const { name, dob, address, phone, email, position, teachingExp, talents, achievements, desiredSalary } = req.body;
      if (!name || !phone || !position || !dob || !address || !teachingExp) {
        return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (Họ tên, Ngày sinh, Địa chỉ, SĐT, Vị trí, Kinh nghiệm dạy).' });
      }

      const candidatesFile = path.join(process.cwd(), 'data', 'candidates.json');
      const dataDir = path.dirname(candidatesFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      let candidates: any[] = [];
      if (fs.existsSync(candidatesFile)) {
        try {
          candidates = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
        } catch (_) {}
      }

      const files = (req.files as any[] || []).map(f => ({
        name: f.originalname,
        url: `/uploads/candidates/${f.filename}`,
        type: f.mimetype
      }));

      const newCandidate = {
        id: 'CAN-' + Date.now().toString(),
        name,
        dob,
        address,
        phone,
        email: email || '',
        position,
        teachingExp,
        talents: talents || '',
        achievements: achievements || '',
        desiredSalary: desiredSalary || '',
        date: new Date().toLocaleDateString('vi-VN'),
        status: 'pending',
        rating: 0,
        notes: '',
        files
      };

      candidates.push(newCandidate);
      fs.writeFileSync(candidatesFile, JSON.stringify(candidates, null, 2), 'utf8');

      // Send Telegram notification to Admin
      const tgMsg = `👤 <b>ỨNG VIÊN GIÁO VIÊN MỚI!</b>\n\n<b>Họ tên:</b> ${newCandidate.name}\n<b>Ngày sinh:</b> ${newCandidate.dob}\n<b>Địa chỉ:</b> ${newCandidate.address}\n<b>Vị trí:</b> ${newCandidate.position}\n<b>Điện thoại:</b> ${newCandidate.phone}\n<b>Mức lương mong muốn:</b> ${newCandidate.desiredSalary || 'Thỏa thuận'}\n<i>Hồ sơ đính kèm: ${files.length} file. Vui lòng truy cập Web Admin để duyệt!</i>`;
      await botService.sendMessage(tgMsg);

      res.json({ success: true, candidate: newCandidate });
    } catch (err: any) {
      console.error('Candidate apply failed:', err);
      res.status(500).json({ error: err.message || 'Lỗi gửi hồ sơ ứng tuyển' });
    }
  });

  // Admin candidates list
  app.get('/api/candidates', (req, res) => {
    const candidatesFile = path.join(process.cwd(), 'data', 'candidates.json');
    if (fs.existsSync(candidatesFile)) {
      try {
        const candidates = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
        return res.json(candidates);
      } catch (_) {}
    }
    res.json([]);
  });

  async function sendCandidateRejectionEmail(candidate: any) {
    try {
      const emailConfigPath = path.join(process.cwd(), 'data', 'email_config.json');
      if (!fs.existsSync(emailConfigPath)) {
        console.warn('Email config not found, cannot send rejection email.');
        return false;
      }
      
      const emailConfig = JSON.parse(fs.readFileSync(emailConfigPath, 'utf8'));
      if (!emailConfig.email || !emailConfig.password) {
        console.warn('Email credentials not set, cannot send rejection email.');
        return false;
      }

      // Automatically construct SMTP host based on IMAP host
      const smtpHost = (emailConfig.host || 'imap.gmail.com').replace(/^imap\./i, 'smtp.');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: {
          user: emailConfig.email,
          pass: emailConfig.password
        }
      });

      const emailSubject = `Kết quả ứng tuyển vị trí ${candidate.position} - Văn Phòng Kim`;
      
      const emailBody = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 16px; background-color: #ffffff;">
  <h2 style="color: #4f46e5; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; margin-top: 0;">Kết Quả Ứng Tuyển Nhân Sự</h2>
  <p>Chào bạn <strong>${candidate.name}</strong>,</p>
  <p>Cảm ơn bạn đã quan tâm đến cơ hội nghề nghiệp tại Văn Phòng Kim và dành thời gian nộp hồ sơ ứng tuyển vào vị trí <strong>${candidate.position}</strong>.</p>
  <p>Chúng tôi đã nhận được và xem xét rất kỹ lưỡng hồ sơ cùng các bằng cấp, chứng chỉ đính kèm của bạn. Tuy nhiên, sau khi cân đối với các tiêu chí tuyển dụng hiện tại cho vị trí này, chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn chưa hoàn toàn phù hợp với nhu cầu tuyển dụng đợt này của Văn Phòng Kim.</p>
  <p>Thông tin của bạn đã được chúng tôi lưu trữ bảo mật trong cơ sở dữ liệu nhân sự tài năng. Chúng tôi sẽ chủ động liên hệ lại nếu có các vị trí khác phù hợp hơn với năng lực của bạn trong tương lai.</p>
  <p>Chúc bạn luôn nhiều sức khỏe, may mắn và gặt hái được nhiều thành công trên con đường sự nghiệp của mình.</p>
  <p style="margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; font-size: 0.9em; color: #64748b;">
    Trân trọng,<br/>
    <strong>Ban Tuyển Dụng - Văn Phòng Kim</strong>
  </p>
</div>
      `;

      await transporter.sendMail({
        from: `"Văn Phòng Kim" <${emailConfig.email}>`,
        to: candidate.email,
        subject: emailSubject,
        html: emailBody
      });

      console.log(`Rejection email sent successfully to ${candidate.email}`);
      return true;
    } catch (err) {
      console.error('Failed to send rejection email:', err);
      return false;
    }
  }

  // Admin update candidate status
  app.put('/api/candidates/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rating, notes } = req.body;
    
    const candidatesFile = path.join(process.cwd(), 'data', 'candidates.json');
    if (!fs.existsSync(candidatesFile)) {
      return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
    }

    try {
      let candidates = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
      const index = candidates.findIndex((c: any) => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
      }

      const oldStatus = candidates[index].status;

      if (status !== undefined) candidates[index].status = status;
      if (rating !== undefined) candidates[index].rating = Number(rating);
      if (notes !== undefined) candidates[index].notes = notes;

      fs.writeFileSync(candidatesFile, JSON.stringify(candidates, null, 2), 'utf8');

      // Check if status changed to rejected
      if (status === 'rejected' && oldStatus !== 'rejected' && candidates[index].email) {
        sendCandidateRejectionEmail(candidates[index]);
      }

      res.json({ success: true, candidate: candidates[index] });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi cập nhật hồ sơ' });
    }
  });

  // Admin delete candidate application
  app.delete('/api/candidates/:id', (req, res) => {
    const { id } = req.params;
    const candidatesFile = path.join(process.cwd(), 'data', 'candidates.json');
    if (!fs.existsSync(candidatesFile)) {
      return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
    }

    try {
      let candidates = JSON.parse(fs.readFileSync(candidatesFile, 'utf8'));
      const index = candidates.findIndex((c: any) => c.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Không tìm thấy ứng viên.' });
      }

      // Delete files from disk
      const files = candidates[index].files || [];
      for (const f of files) {
        if (f.url) {
          const filepath = path.join(process.cwd(), f.url);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
        }
      }

      candidates.splice(index, 1);
      fs.writeFileSync(candidatesFile, JSON.stringify(candidates, null, 2), 'utf8');
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lỗi xóa ứng viên' });
    }
  });

// Router exported as officeRouter
