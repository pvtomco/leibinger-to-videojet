# Sharing the Leibinger → VideoJet Converter with your team

**Live app:** https://leibinger-to-videojet.vercel.app

---

## 1) Message to send colleagues (copy-paste)

**English**

> **New tool: Leibinger → VideoJet file converter**
> Convert Leibinger `.job` files into ready-to-import `.bmp` files for our VideoJet 1580/1880 printers — right in your browser, no install.
>
> 🔗 https://leibinger-to-videojet.vercel.app
>
> How to use:
> 1. Open the link and click **Sign in with Google** — use your **@tomco.co.th** email.
> 2. Drag a `.job` file onto the page (or click to browse). It converts instantly.
> 3. Check the preview + barcode, then click **Download .bmp**.
> 4. Import the `.bmp` into the VideoJet as a logo/graphic.
>
> Tip: click **Save to team library** to keep a conversion for everyone — it shows up for the whole team on any device.
> Only @tomco.co.th accounts can sign in.

**ภาษาไทย**

> **เครื่องมือใหม่: แปลงไฟล์ Leibinger → VideoJet**
> แปลงไฟล์ `.job` ของ Leibinger เป็นไฟล์ `.bmp` พร้อม import เข้าเครื่อง VideoJet 1580/1880 ทำงานบนเว็บ ไม่ต้องติดตั้งโปรแกรม
>
> 🔗 https://leibinger-to-videojet.vercel.app
>
> วิธีใช้:
> 1. เปิดลิงก์ แล้วกด **Sign in with Google** เข้าสู่ระบบด้วยอีเมล **@tomco.co.th** ของคุณ
> 2. ลากไฟล์ `.job` ลงในหน้าเว็บ (หรือคลิกเพื่อเลือกไฟล์) ระบบจะแปลงให้ทันที
> 3. ตรวจดูตัวอย่างและบาร์โค้ด แล้วกด **Download .bmp**
> 4. นำไฟล์ `.bmp` ไป import เข้าเครื่อง VideoJet เป็นโลโก้/กราฟิก
>
> เคล็ดลับ: กด **Save to team library** เพื่อบันทึกให้ทั้งทีมใช้ร่วมกัน (เห็นได้ทุกคน ทุกอุปกรณ์)
> เข้าใช้ได้เฉพาะอีเมล @tomco.co.th เท่านั้น

---

## 2) What a colleague sees on first sign-in

1. Opens the link → a login page with the Tomco logo and **Sign in with Google**.
2. Clicks it → Google asks which account → they pick their **@tomco.co.th** account.
3. First time only: Google shows a quick "continue / allow" screen (name + email) → continue.
4. They land on the converter, with the **Team library** below it.

If someone signs in with a personal Gmail (not @tomco.co.th), they're politely blocked and asked to use their company account.

## 3) How the shared "Team library" works

- Everyone signed in sees **the same** saved conversions (one shared set).
- **Save to team library** stores the `.bmp`, a preview image, the settings used, and the original `.job`.
- Anyone can re-download any saved `.bmp` or `.job`, from any device.
- It's stored in the cloud, so it syncs everywhere automatically.
- A conversion you only *download* (without saving) stays on your computer — nothing is uploaded unless you click Save.

## 4) Good to know (for you, the owner)

- **Cost:** runs on free tiers (Supabase free + Vercel Hobby). If usage grows a lot, Vercel may ask you to move to Pro (~$20/mo) for commercial use — fine to start free.
- **Updating it:** just ask Claude for a change; it's committed and Vercel auto-rebuilds in ~1–2 min. No tokens needed (your GitHub login is cached on your Mac).
- **Where it lives:**
  - Code: GitHub `pvtomco/leibinger-to-videojet`
  - Hosting: Vercel (team "Tomco System")
  - Login + data + files: Supabase (project `tjnkuapfrysxmuwqfche`)
- **Access:** anyone with an @tomco.co.th Google account can use it automatically — no per-user setup. To see who has used it, check Supabase → Authentication → Users.
- **Custom domain (optional later):** you could point something like `tools.tomco.co.th` at it in Vercel → Domains, if you'd like a branded URL instead of the `.vercel.app` one.
