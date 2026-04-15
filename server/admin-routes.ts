/**
 * Professional Admin Panel
 * /admin — Web panel
 * /api/admin/* — Admin API endpoints
 */
import type { Express, Request, Response, NextFunction } from "express";
import * as db from "./db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "cq_admin_2026";

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_PASSWORD}`) { next(); return; }
  res.status(401).json({ error: "Unauthorized" });
}

export function registerAdminRoutes(app: Express) {

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: ADMIN_PASSWORD });
    } else {
      res.status(401).json({ error: "Yanlış şifre" });
    }
  });

  // ─── Dashboard Stats ───
  app.get("/api/admin/stats", adminAuth, async (_req, res) => {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) return res.json({ error: "DB yok" });
      const { users, userCredits, generatedImages, notifications } = await import("../drizzle/schema");
      const { count, sum, eq, gte, and, sql } = await import("drizzle-orm");

      const [userCount] = await dbConn.select({ count: count() }).from(users);
      const [imageCount] = await dbConn.select({ count: count() }).from(generatedImages);
      const [creditStats] = await dbConn.select({
        totalCredits: sum(userCredits.totalCredits),
        usedCredits: sum(userCredits.usedCredits),
      }).from(userCredits);

      // Bugünün istatistikleri
      const today = new Date(); today.setHours(0,0,0,0);
      const [todayImages] = await dbConn.select({ count: count() }).from(generatedImages).where(gte(generatedImages.createdAt, today));
      const [todayUsers] = await dbConn.select({ count: count() }).from(users).where(gte(users.createdAt, today));

      // Son 7 gün günlük istatistikler
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const [imgs] = await dbConn.select({ count: count() }).from(generatedImages).where(and(gte(generatedImages.createdAt, d), sql`${generatedImages.createdAt} < ${next}`));
        const [usrs] = await dbConn.select({ count: count() }).from(users).where(and(gte(users.createdAt, d), sql`${users.createdAt} < ${next}`));
        dailyStats.push({
          date: d.toISOString().split("T")[0],
          label: d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" }),
          images: imgs.count,
          users: usrs.count,
        });
      }

      // Plan dağılımı
      const planStats = await dbConn.select({
        tier: userCredits.subscriptionTier,
        count: count(),
      }).from(userCredits).groupBy(userCredits.subscriptionTier);

      res.json({
        users: userCount.count,
        images: imageCount.count,
        totalCredits: Number(creditStats.totalCredits) || 0,
        usedCredits: Number(creditStats.usedCredits) || 0,
        todayImages: todayImages.count,
        todayUsers: todayUsers.count,
        dailyStats,
        planStats,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Users List ───
  app.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) return res.json([]);
      const { users } = await import("../drizzle/schema");
      const { desc, like } = await import("drizzle-orm");

      const search = req.query.search as string;
      let query = dbConn.select().from(users).orderBy(desc(users.lastSignedIn)).limit(100);

      const result = search
        ? await dbConn.select().from(users).where(like(users.phone, `%${search}%`)).orderBy(desc(users.lastSignedIn)).limit(100)
        : await query;

      const usersWithCredits = await Promise.all(
        result.map(async (u) => {
          const credits = await db.getUserCredits(u.id);
          const images = await db.getUserGeneratedImages(u.id);
          return {
            id: u.id, phone: u.phone, name: u.name, role: u.role,
            loraStatus: u.loraStatus, loraTrainCount: u.loraTrainCount,
            createdAt: u.createdAt, lastSignedIn: u.lastSignedIn,
            totalCredits: credits?.totalCredits ?? 0,
            usedCredits: credits?.usedCredits ?? 0,
            remainingCredits: (credits?.totalCredits ?? 0) - (credits?.usedCredits ?? 0),
            subscriptionTier: credits?.subscriptionTier ?? "free",
            imageCount: images.length,
          };
        })
      );
      res.json(usersWithCredits);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── User Detail ───
  app.get("/api/admin/users/:id", adminAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const user = await db.getUserById(userId);
      const credits = await db.getUserCredits(userId);
      const images = await db.getUserGeneratedImages(userId);
      const photos = await db.getTrainingPhotos(userId);
      const facePhotos = await db.getUserReferencePhotos(userId, "face");
      res.json({ user, credits, images, trainingPhotos: photos.length, facePhotos: facePhotos.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Add/Remove Credits ───
  app.post("/api/admin/users/:id/credits", adminAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ error: "Miktar gerekli" });
      const credits = await db.getUserCredits(userId);
      if (!credits) {
        await db.createUserCredits({ userId, totalCredits: Math.max(0, amount), usedCredits: 0, subscriptionTier: "free" });
      } else {
        await db.updateUserCredits(userId, { totalCredits: Math.max(0, credits.totalCredits + amount) });
      }
      res.json({ success: true, message: `${amount > 0 ? '+' : ''}${amount} kredi` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Change Plan ───
  app.post("/api/admin/users/:id/plan", adminAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { tier } = req.body;
      if (!["free", "pro", "premium"].includes(tier)) return res.status(400).json({ error: "Geçersiz plan" });
      const credits = await db.getUserCredits(userId);
      if (credits) {
        await db.updateUserCredits(userId, { subscriptionTier: tier });
      }
      res.json({ success: true, message: `Plan: ${tier}` });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Reset LoRA ───
  app.post("/api/admin/users/:id/reset-lora", adminAuth, async (req, res) => {
    try {
      const userId = Number(req.params.id);
      await db.updateUserLoRA(userId, { loraStatus: "none", loraTrainingId: null, loraModelUrl: null, loraModelVersion: null, loraTrainedAt: null });
      const dbConn = await db.getDb();
      if (dbConn) {
        const { eq } = await import("drizzle-orm");
        const { users } = await import("../drizzle/schema");
        await dbConn.update(users).set({ loraTrainCount: 0, loraTrainResetAt: null }).where(eq(users.id, userId));
      }
      res.json({ success: true, message: "LoRA sıfırlandı" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Delete Image ───
  app.delete("/api/admin/images/:id", adminAuth, async (req, res) => {
    try {
      await db.deleteGeneratedImage(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── All Images ───
  app.get("/api/admin/images", adminAuth, async (_req, res) => {
    try {
      const dbConn = await db.getDb();
      if (!dbConn) return res.json([]);
      const { generatedImages, users } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      const imgs = await dbConn.select({
        id: generatedImages.id, userId: generatedImages.userId,
        generatedImageUrl: generatedImages.generatedImageUrl,
        style: generatedImages.style, status: generatedImages.status,
        creditsUsed: generatedImages.creditsUsed, createdAt: generatedImages.createdAt,
      }).from(generatedImages).orderBy(desc(generatedImages.createdAt)).limit(50);
      res.json(imgs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Send Push to All ───
  app.post("/api/admin/push", adminAuth, async (req, res) => {
    try {
      const { title, body } = req.body;
      if (!title || !body) return res.status(400).json({ error: "Başlık ve mesaj gerekli" });
      const dbConn = await db.getDb();
      if (!dbConn) return res.json({ sent: 0 });
      const { users } = await import("../drizzle/schema");
      const { isNotNull } = await import("drizzle-orm");
      const usersWithTokens = await dbConn.select({ id: users.id, pushToken: users.pushToken }).from(users).where(isNotNull(users.pushToken));

      let sent = 0;
      for (const u of usersWithTokens) {
        if (!u.pushToken) continue;
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: u.pushToken, title, body, sound: "default" }),
          });
          await db.createNotification({ userId: u.id, type: "admin", title, body, data: JSON.stringify({ type: "admin" }) });
          sent++;
        } catch {}
      }
      res.json({ success: true, sent, total: usersWithTokens.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Pose Categories ───
  app.get("/api/admin/poses", adminAuth, async (_req, res) => {
    try {
      const cats = await db.getPoseCategories();
      const result = await Promise.all(cats.map(async (c) => ({
        ...c,
        poses: await db.getPoseTemplates(c.id),
      })));
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/poses/category", adminAuth, async (req, res) => {
    try {
      const { name, emoji } = req.body;
      if (!name || !emoji) return res.status(400).json({ error: "İsim ve emoji gerekli" });
      const id = await db.createPoseCategory({ name, emoji, sortOrder: 99 });
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/poses/category/:id", adminAuth, async (req, res) => {
    try {
      await db.deletePoseCategory(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/poses/template", adminAuth, async (req, res) => {
    try {
      const { categoryId, label, imageUrl } = req.body;
      if (!categoryId || !label || !imageUrl) return res.status(400).json({ error: "Tüm alanlar gerekli" });
      const id = await db.createPoseTemplate({ categoryId, label, imageUrl, sortOrder: 99 });
      res.json({ success: true, id });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/poses/template/upload", adminAuth, async (req, res) => {
    try {
      const { categoryId, label, base64 } = req.body;
      if (!categoryId || !label || !base64) return res.status(400).json({ error: "Tüm alanlar gerekli" });
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(base64, "base64");
      const key = `poses/${Date.now()}-${label.replace(/\\s+/g, '-').toLowerCase()}.jpg`;
      const { url } = await storagePut(key, buffer, "image/jpeg");
      const id = await db.createPoseTemplate({ categoryId, label, imageUrl: url, sortOrder: 99 });
      res.json({ success: true, id, imageUrl: url });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/poses/template/:id", adminAuth, async (req, res) => {
    try {
      await db.deletePoseTemplate(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── System Status ───
  app.get("/api/admin/system", adminAuth, async (_req, res) => {
    try {
      const os = await import("os");
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      res.json({
        uptime: Math.floor(process.uptime()),
        memory: { total: Math.round(totalMem / 1024 / 1024), free: Math.round(freeMem / 1024 / 1024), used: Math.round((totalMem - freeMem) / 1024 / 1024) },
        cpu: os.cpus().length,
        platform: os.platform(),
        nodeVersion: process.version,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ─── Admin Web Panel ───
  app.get("/admin", (_req, res) => { res.send(ADMIN_HTML); });
}

const ADMIN_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Content Queen Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a0a;color:#e0e0e0;font-size:14px}
a{color:#E94B8F;text-decoration:none}
.login-screen{display:flex;justify-content:center;align-items:center;min-height:100vh}
.login-box{background:#161616;padding:40px;border-radius:20px;width:380px;text-align:center;border:1px solid #222}
.login-box h1{font-size:28px;margin-bottom:6px}
.login-box p{color:#666;font-size:13px;margin-bottom:28px}
input,select,textarea{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #2a2a2a;background:#111;color:#e0e0e0;font-size:14px;outline:none;margin-bottom:12px}
input:focus,select:focus,textarea:focus{border-color:#E94B8F}
.btn{padding:12px 20px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:all .15s}
.btn-primary{background:#E94B8F;color:#fff}.btn-primary:hover{background:#d63d7d}
.btn-green{background:#34C759;color:#fff}.btn-green:hover{background:#2db84e}
.btn-red{background:#FF3B30;color:#fff}.btn-red:hover{background:#e0332a}
.btn-ghost{background:#1e1e1e;color:#999;border:1px solid #2a2a2a}.btn-ghost:hover{color:#fff;border-color:#444}
.btn-sm{padding:6px 12px;font-size:12px;border-radius:8px}
.btn-block{width:100%;display:block}

.app{display:none;min-height:100vh;width:100%;max-width:100vw}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:#111;border-right:1px solid #1e1e1e;padding:20px 0;overflow-y:auto;z-index:10}
.sidebar .logo{padding:0 20px 20px;font-size:18px;font-weight:800;border-bottom:1px solid #1e1e1e;margin-bottom:12px}
.sidebar .logo span{color:#E94B8F}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;color:#888;cursor:pointer;font-size:13px;font-weight:500;transition:all .15s}
.nav-item:hover{color:#e0e0e0;background:#1a1a1a}
.nav-item.active{color:#E94B8F;background:rgba(233,75,143,0.08);border-right:3px solid #E94B8F}
.main{margin-left:220px;padding:24px;min-height:100vh;width:calc(100vw - 220px)}

.page{display:none}.page.active{display:block}
.page-title{font-size:20px;font-weight:700;margin-bottom:20px}

.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px}
.stat-card{background:#161616;border:1px solid #1e1e1e;border-radius:14px;padding:18px}
.stat-card .icon{font-size:24px;margin-bottom:8px}
.stat-card .num{font-size:28px;font-weight:800;color:#E94B8F}
.stat-card .label{font-size:11px;color:#666;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.stat-card.green .num{color:#34C759}
.stat-card.gold .num{color:#D4AF37}

.card{background:#161616;border:1px solid #1e1e1e;border-radius:14px;padding:20px;margin-bottom:16px}
.card h3{font-size:15px;font-weight:600;margin-bottom:14px}

.chart-bar{display:flex;align-items:flex-end;gap:8px;height:120px;margin-top:12px}
.chart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
.chart-col .bar{width:100%;border-radius:6px 6px 0 0;background:#E94B8F;min-height:2px;transition:height .3s}
.chart-col .val{font-size:10px;color:#888}
.chart-col .day{font-size:10px;color:#555}

table{width:100%;border-collapse:collapse}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #1e1e1e;font-size:13px}
th{color:#666;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px;position:sticky;top:0;background:#161616}
tr:hover{background:#1a1a1a}
.badge{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;display:inline-block}
.badge-free{background:#222;color:#666}
.badge-pro{background:rgba(233,75,143,.12);color:#E94B8F}
.badge-premium{background:rgba(212,175,55,.12);color:#D4AF37}
.badge-ready{background:rgba(52,199,89,.12);color:#34C759}
.badge-none{background:#1e1e1e;color:#555}
.badge-training{background:rgba(255,149,0,.12);color:#FF9500}
.badge-completed{background:rgba(52,199,89,.12);color:#34C759}
.badge-failed{background:rgba(255,59,48,.12);color:#FF3B30}
.badge-pending{background:rgba(255,149,0,.12);color:#FF9500}

.actions{display:flex;gap:6px;flex-wrap:wrap}
.search-bar{display:flex;gap:8px;margin-bottom:16px}
.search-bar input{margin-bottom:0;flex:1}

.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);justify-content:center;align-items:center;z-index:200}
.modal-overlay.show{display:flex}
.modal{background:#161616;border:1px solid #2a2a2a;padding:24px;border-radius:16px;width:420px;max-width:90vw;max-height:85vh;overflow-y:auto}
.modal h3{font-size:17px;margin-bottom:16px}
.modal-actions{display:flex;gap:8px;margin-top:16px}

.img-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.img-grid img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid #222}
.img-grid img:hover{border-color:#E94B8F}
.img-grid img[src=""]{display:none}
.img-broken{display:none}

.toast{position:fixed;bottom:24px;right:24px;background:#34C759;color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;font-size:13px;z-index:300;display:none}
.toast.error{background:#FF3B30}

.sys-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e1e1e}
.sys-row:last-child{border:none}
.sys-label{color:#666}.sys-val{font-weight:600}

@media(max-width:768px){
.sidebar{width:60px;padding:12px 0}.sidebar .logo{padding:0 8px 12px;font-size:12px}.sidebar .logo span{display:none}
.nav-item{padding:10px;justify-content:center}.nav-item span{display:none}
.main{margin-left:60px;padding:16px}
.stats-grid{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>

<div class="login-screen" id="loginScreen">
<div class="login-box">
<h1>👑 Content Queen</h1>
<p>Admin Panel</p>
<input type="password" id="pw" placeholder="Şifre" onkeydown="if(event.key==='Enter')login()">
<button class="btn btn-primary btn-block" onclick="login()">Giriş Yap</button>
<div id="loginErr" style="color:#FF3B30;font-size:12px;margin-top:8px"></div>
</div>
</div>

<div class="app" id="app">
<div class="sidebar">
<div class="logo">👑 <span>Content Queen</span></div>
<div class="nav-item active" onclick="showPage('dashboard')">📊 <span>Dashboard</span></div>
<div class="nav-item" onclick="showPage('users')">👥 <span>Kullanıcılar</span></div>
<div class="nav-item" onclick="showPage('images')">🖼 <span>Görseller</span></div>
<div class="nav-item" onclick="showPage('push')">📢 <span>Bildirimler</span></div>
<div class="nav-item" onclick="showPage('poses')">📸 <span>Şablonlar</span></div>
<div class="nav-item" onclick="showPage('system')">⚙️ <span>Sistem</span></div>
<div class="nav-item" onclick="logout()" style="margin-top:auto;color:#FF3B30">🚪 <span>Çıkış</span></div>
</div>

<div class="main">

<!-- DASHBOARD -->
<div class="page active" id="page-dashboard">
<div class="page-title">Dashboard</div>
<div class="stats-grid" id="statsGrid"></div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
<div class="card"><h3>📈 Günlük Görsel Üretimi (7 gün)</h3><div class="chart-bar" id="chartImages"></div></div>
<div class="card"><h3>👥 Yeni Kullanıcılar (7 gün)</h3><div class="chart-bar" id="chartUsers"></div></div>
</div>
<div class="card"><h3>📊 Plan Dağılımı</h3><div id="planStats"></div></div>
</div>

<!-- USERS -->
<div class="page" id="page-users">
<div class="page-title">Kullanıcılar</div>
<div class="search-bar">
<input type="text" id="userSearch" placeholder="Telefon ile ara..." onkeydown="if(event.key==='Enter')loadUsers()">
<button class="btn btn-primary" onclick="loadUsers()">Ara</button>
<button class="btn btn-ghost" onclick="document.getElementById('userSearch').value='';loadUsers()">Temizle</button>
</div>
<div class="card" style="padding:0;overflow-x:auto">
<table>
<thead><tr><th>ID</th><th>Telefon</th><th>Plan</th><th>Kredi</th><th>Görsel</th><th>LoRA</th><th>Son Giriş</th><th>İşlem</th></tr></thead>
<tbody id="usersTable"></tbody>
</table>
</div>
</div>

<!-- IMAGES -->
<div class="page" id="page-images">
<div class="page-title">Görseller</div>
<div class="card"><div class="img-grid" id="imagesGrid"></div></div>
</div>

<!-- PUSH -->
<div class="page" id="page-push">
<div class="page-title">Toplu Bildirim Gönder</div>
<div class="card">
<h3>📢 Tüm Kullanıcılara Bildirim</h3>
<input type="text" id="pushTitle" placeholder="Başlık">
<textarea id="pushBody" placeholder="Mesaj" rows="3" style="resize:vertical"></textarea>
<button class="btn btn-primary" onclick="sendPush()">Gönder</button>
<div id="pushResult" style="margin-top:8px"></div>
</div>
</div>

<!-- POSES -->
<div class="page" id="page-poses">
<div class="page-title">Şablon Yönetimi</div>
<div style="display:flex;gap:8px;margin-bottom:16px">
<button class="btn btn-primary" onclick="openAddCategory()">+ Kategori Ekle</button>
<button class="btn btn-green" onclick="openAddTemplate()">+ Şablon Ekle</button>
</div>
<div id="posesContent"></div>
</div>

<!-- SYSTEM -->
<div class="page" id="page-system">
<div class="page-title">Sistem Durumu</div>
<div class="card" id="sysInfo"></div>
</div>

</div>
</div>

<!-- USER DETAIL MODAL -->
<div class="modal-overlay" id="userModal">
<div class="modal">
<h3 id="modalTitle">Kullanıcı Detay</h3>
<div id="modalContent"></div>
<div class="modal-actions">
<button class="btn btn-ghost" onclick="closeModal('userModal')">Kapat</button>
</div>
</div>
</div>

<!-- CREDIT MODAL -->
<div class="modal-overlay" id="creditModal">
<div class="modal">
<h3>Kredi Ekle/Çıkar</h3>
<input type="number" id="creditAmt" placeholder="Miktar (negatif = çıkar)">
<div class="modal-actions">
<button class="btn btn-green" onclick="doAddCredits()">Uygula</button>
<button class="btn btn-ghost" onclick="closeModal('creditModal')">İptal</button>
</div>
<div id="creditRes" style="margin-top:8px"></div>
</div>
</div>

<!-- PLAN MODAL -->
<div class="modal-overlay" id="planModal">
<div class="modal">
<h3>Plan Değiştir</h3>
<select id="planSelect"><option value="free">Free</option><option value="pro">Pro</option><option value="premium">Premium</option></select>
<div class="modal-actions">
<button class="btn btn-primary" onclick="doChangePlan()">Değiştir</button>
<button class="btn btn-ghost" onclick="closeModal('planModal')">İptal</button>
</div>
</div>
</div>

<div class="toast" id="toast"></div>

<!-- ADD CATEGORY MODAL -->
<div class="modal-overlay" id="catModal">
<div class="modal">
<h3>Kategori Ekle</h3>
<input type="text" id="catName" placeholder="Kategori adı (ör: Seyahat)">
<input type="text" id="catEmoji" placeholder="Emoji (ör: ✈️)" maxlength="4">
<div class="modal-actions">
<button class="btn btn-primary" onclick="doAddCategory()">Ekle</button>
<button class="btn btn-ghost" onclick="closeModal('catModal')">İptal</button>
</div>
</div>
</div>

<!-- ADD TEMPLATE MODAL -->
<div class="modal-overlay" id="tplModal">
<div class="modal">
<h3>Şablon Ekle</h3>
<select id="tplCat"></select>
<input type="text" id="tplLabel" placeholder="Etiket (ör: Paris)">
<div style="margin-bottom:12px">
<label style="display:block;margin-bottom:6px;color:#888;font-size:12px">Fotoğraf Yükle</label>
<input type="file" id="tplFile" accept="image/*" style="font-size:12px">
</div>
<div class="modal-actions">
<button class="btn btn-green" onclick="doAddTemplate()">Yükle & Ekle</button>
<button class="btn btn-ghost" onclick="closeModal('tplModal')">İptal</button>
</div>
<div id="tplResult" style="margin-top:8px"></div>
</div>
</div>

<script>
let T=localStorage.getItem('cq_admin_token'),selUser=null;
if(T)showApp();

function login(){
  const p=document.getElementById('pw').value;
  fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:p})})
  .then(r=>r.json()).then(d=>{if(d.success){T=d.token;localStorage.setItem('cq_admin_token',T);showApp()}else{document.getElementById('loginErr').textContent='Yanlış şifre'}});
}
function logout(){T=null;localStorage.removeItem('cq_admin_token');location.reload()}
function showApp(){document.getElementById('loginScreen').style.display='none';document.getElementById('app').style.display='flex';loadDashboard();loadUsers()}
function api(p,o){return fetch(p,{...o,headers:{...o?.headers,'Authorization':'Bearer '+T}}).then(r=>{if(r.status===401){logout();return null}return r.json()})}
function toast(msg,err){const t=document.getElementById('toast');t.textContent=msg;t.className='toast'+(err?' error':'');t.style.display='block';setTimeout(()=>t.style.display='none',3000)}

function showPage(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  document.querySelectorAll('.nav-item')[['dashboard','users','images','push','poses','system'].indexOf(id)].classList.add('active');
  if(id==='images')loadImages();
  if(id==='system')loadSystem();
  if(id==='poses')loadPoses();
}

async function loadDashboard(){
  const s=await api('/api/admin/stats');if(!s)return;
  document.getElementById('statsGrid').innerHTML=
    sc('👥','Toplam Kullanıcı',s.users,'')+sc('🖼','Toplam Görsel',s.images,'')+
    sc('📸','Bugün Görsel',s.todayImages,'green')+sc('🆕','Bugün Yeni Kullanıcı',s.todayUsers,'green')+
    sc('💎','Toplam Kredi',s.totalCredits,'gold')+sc('📊','Kullanılan Kredi',s.usedCredits,'');
  // Charts
  const maxI=Math.max(...s.dailyStats.map(d=>d.images),1);
  const maxU=Math.max(...s.dailyStats.map(d=>d.users),1);
  document.getElementById('chartImages').innerHTML=s.dailyStats.map(d=>'<div class="chart-col"><div class="val">'+d.images+'</div><div class="bar" style="height:'+Math.max(2,d.images/maxI*100)+'px"></div><div class="day">'+d.label+'</div></div>').join('');
  document.getElementById('chartUsers').innerHTML=s.dailyStats.map(d=>'<div class="chart-col"><div class="val">'+d.users+'</div><div class="bar" style="height:'+Math.max(2,d.users/maxU*100)+'px;background:#34C759"></div><div class="day">'+d.label+'</div></div>').join('');
  // Plan stats
  const planMap={free:'Free',pro:'Pro',premium:'Premium'};
  document.getElementById('planStats').innerHTML=s.planStats.map(p=>'<div style="display:flex;justify-content:space-between;padding:6px 0"><span class="badge badge-'+p.tier+'">'+planMap[p.tier]+'</span><span>'+p.count+' kullanıcı</span></div>').join('');
}
function sc(icon,label,num,cls){return '<div class="stat-card '+cls+'"><div class="icon">'+icon+'</div><div class="num">'+num+'</div><div class="label">'+label+'</div></div>'}

async function loadUsers(){
  const q=document.getElementById('userSearch').value;
  const u=await api('/api/admin/users'+(q?'?search='+encodeURIComponent(q):''));if(!u)return;
  document.getElementById('usersTable').innerHTML=u.map(r=>'<tr>'+
    '<td>'+r.id+'</td>'+
    '<td><a href="#" onclick="openUser('+r.id+');return false">'+r.phone+'</a></td>'+
    '<td><span class="badge badge-'+r.subscriptionTier+'">'+r.subscriptionTier+'</span></td>'+
    '<td>'+r.remainingCredits+'/'+r.totalCredits+'</td>'+
    '<td>'+r.imageCount+'</td>'+
    '<td><span class="badge badge-'+(r.loraStatus==='ready'?'ready':r.loraStatus==='training'?'training':'none')+'">'+r.loraStatus+'</span></td>'+
    '<td>'+new Date(r.lastSignedIn).toLocaleDateString('tr-TR')+'</td>'+
    '<td><div class="actions">'+
      '<button class="btn btn-sm btn-green" onclick="openCredits('+r.id+')">Kredi</button>'+
      '<button class="btn btn-sm btn-primary" onclick="openPlan('+r.id+')">Plan</button>'+
      '<button class="btn btn-sm btn-red" onclick="resetLora('+r.id+')">LoRA</button>'+
    '</div></td></tr>').join('');
}

async function openUser(id){
  const d=await api('/api/admin/users/'+id);if(!d)return;
  const u=d.user;
  let html='<div class="sys-row"><span class="sys-label">Telefon</span><span class="sys-val">'+u.phone+'</span></div>';
  html+='<div class="sys-row"><span class="sys-label">LoRA</span><span class="badge badge-'+(u.loraStatus==='ready'?'ready':'none')+'">'+u.loraStatus+'</span></div>';
  html+='<div class="sys-row"><span class="sys-label">Kredi</span><span class="sys-val">'+(d.credits?(d.credits.totalCredits-d.credits.usedCredits)+'/'+d.credits.totalCredits:'0')+'</span></div>';
  html+='<div class="sys-row"><span class="sys-label">Plan</span><span class="badge badge-'+(d.credits?.subscriptionTier||'free')+'">'+(d.credits?.subscriptionTier||'free')+'</span></div>';
  html+='<div class="sys-row"><span class="sys-label">Eğitim Fotoğrafı</span><span class="sys-val">'+d.trainingPhotos+'</span></div>';
  html+='<div class="sys-row"><span class="sys-label">Selfie</span><span class="sys-val">'+d.facePhotos+'</span></div>';
  if(d.images&&d.images.length>0){
    html+='<h3 style="margin:16px 0 8px">Görseller ('+d.images.length+')</h3><div class="img-grid">';
    d.images.slice(0,20).forEach(img=>{
      if(img.generatedImageUrl&&img.generatedImageUrl!=='pending')
        html+='<img src="'+img.generatedImageUrl+'" onclick="window.open(this.src)">';
    });
    html+='</div>';
  }
  document.getElementById('modalTitle').textContent=u.phone+' — Detay';
  document.getElementById('modalContent').innerHTML=html;
  document.getElementById('userModal').classList.add('show');
}

function openCredits(id){selUser=id;document.getElementById('creditAmt').value='';document.getElementById('creditRes').textContent='';document.getElementById('creditModal').classList.add('show')}
function openPlan(id){selUser=id;document.getElementById('planModal').classList.add('show')}
function closeModal(id){document.getElementById(id).classList.remove('show')}

async function doAddCredits(){
  const a=Number(document.getElementById('creditAmt').value);if(!a)return;
  const r=await api('/api/admin/users/'+selUser+'/credits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:a})});
  if(r?.success){toast(r.message);closeModal('creditModal');loadUsers();loadDashboard()}else{document.getElementById('creditRes').innerHTML='<span style="color:#FF3B30">'+(r?.error||'Hata')+'</span>'}
}
async function doChangePlan(){
  const t=document.getElementById('planSelect').value;
  const r=await api('/api/admin/users/'+selUser+'/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tier:t})});
  if(r?.success){toast(r.message);closeModal('planModal');loadUsers()}
}
async function resetLora(id){
  if(!confirm('LoRA sıfırlansın mı?'))return;
  const r=await api('/api/admin/users/'+id+'/reset-lora',{method:'POST'});
  if(r?.success){toast(r.message);loadUsers()}
}

async function loadImages(){
  const imgs=await api('/api/admin/images');if(!imgs)return;
  document.getElementById('imagesGrid').innerHTML=imgs.map(img=>{
    if(!img.generatedImageUrl||img.generatedImageUrl==='pending')return '';
    return '<img src="'+img.generatedImageUrl+'" title="ID:'+img.id+' User:'+img.userId+' '+img.style+'" onclick="window.open(this.src)" onerror="this.style.display=\\'none\\'">';
  }).join('');
}

async function sendPush(){
  const title=document.getElementById('pushTitle').value;
  const body=document.getElementById('pushBody').value;
  if(!title||!body)return;
  const r=await api('/api/admin/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body})});
  if(r?.success){
    document.getElementById('pushResult').innerHTML='<span style="color:#34C759">'+r.sent+'/'+r.total+' kullanıcıya gönderildi</span>';
    document.getElementById('pushTitle').value='';document.getElementById('pushBody').value='';
  }
}

async function loadSystem(){
  const s=await api('/api/admin/system');if(!s)return;
  const h=Math.floor(s.uptime/3600),m=Math.floor((s.uptime%3600)/60);
  document.getElementById('sysInfo').innerHTML=
    '<h3>⚙️ Sunucu Bilgileri</h3>'+
    '<div class="sys-row"><span class="sys-label">Uptime</span><span class="sys-val">'+h+'sa '+m+'dk</span></div>'+
    '<div class="sys-row"><span class="sys-label">RAM Kullanımı</span><span class="sys-val">'+s.memory.used+' / '+s.memory.total+' MB</span></div>'+
    '<div class="sys-row"><span class="sys-label">CPU</span><span class="sys-val">'+s.cpu+' çekirdek</span></div>'+
    '<div class="sys-row"><span class="sys-label">Platform</span><span class="sys-val">'+s.platform+'</span></div>'+
    '<div class="sys-row"><span class="sys-label">Node.js</span><span class="sys-val">'+s.nodeVersion+'</span></div>';
}

let posesData=[];
async function loadPoses(){
  posesData=await api('/api/admin/poses');if(!posesData)return;
  let html='';
  posesData.forEach(cat=>{
    html+='<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3>'+cat.emoji+' '+cat.name+' ('+cat.poses.length+')</h3><button class="btn btn-sm btn-red" onclick="delCategory('+cat.id+')">Sil</button></div>';
    html+='<div class="img-grid">';
    cat.poses.forEach(p=>{
      html+='<div style="position:relative"><img src="'+p.imageUrl+'" title="'+p.label+'" onclick="window.open(this.src)"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.7);padding:4px;text-align:center;font-size:10px;border-radius:0 0 8px 8px">'+p.label+'</div><button class="btn btn-sm btn-red" style="position:absolute;top:2px;right:2px;padding:2px 6px;font-size:10px" onclick="delTemplate('+p.id+')">×</button></div>';
    });
    html+='</div></div>';
  });
  document.getElementById('posesContent').innerHTML=html;
}

function openAddCategory(){document.getElementById('catName').value='';document.getElementById('catEmoji').value='';document.getElementById('catModal').classList.add('show')}
async function doAddCategory(){
  const name=document.getElementById('catName').value,emoji=document.getElementById('catEmoji').value;
  if(!name||!emoji)return;
  const r=await api('/api/admin/poses/category',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,emoji})});
  if(r?.success){toast('Kategori eklendi');closeModal('catModal');loadPoses()}
}
async function delCategory(id){if(!confirm('Kategori ve tüm şablonları silinecek!'))return;await api('/api/admin/poses/category/'+id,{method:'DELETE'});toast('Silindi');loadPoses()}

function openAddTemplate(){
  const sel=document.getElementById('tplCat');
  sel.innerHTML=posesData.map(c=>'<option value="'+c.id+'">'+c.emoji+' '+c.name+'</option>').join('');
  document.getElementById('tplLabel').value='';document.getElementById('tplFile').value='';
  document.getElementById('tplResult').textContent='';
  document.getElementById('tplModal').classList.add('show');
}
async function doAddTemplate(){
  const catId=Number(document.getElementById('tplCat').value);
  const label=document.getElementById('tplLabel').value;
  const file=document.getElementById('tplFile').files[0];
  if(!catId||!label||!file)return;
  document.getElementById('tplResult').innerHTML='<span style="color:#FF9500">Yükleniyor...</span>';
  const reader=new FileReader();
  reader.onload=async function(){
    const base64=reader.result.split(',')[1];
    const r=await api('/api/admin/poses/template/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({categoryId:catId,label,base64})});
    if(r?.success){toast('Şablon eklendi');closeModal('tplModal');loadPoses()}else{document.getElementById('tplResult').innerHTML='<span style="color:#FF3B30">'+(r?.error||'Hata')+'</span>'}
  };
  reader.readAsDataURL(file);
}
async function delTemplate(id){if(!confirm('Şablon silinsin mi?'))return;await api('/api/admin/poses/template/'+id,{method:'DELETE'});toast('Silindi');loadPoses()}
</script>
</body>
</html>`;
