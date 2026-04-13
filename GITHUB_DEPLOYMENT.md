# Zerox eSports Website - GitHub Deployment Guide

## 🚀 Quick Start: Deploy to GitHub Pages

### Step 1: Create GitHub Repository

1. **Go to** [github.com](https://github.com)
2. **Click** "New Repository" (green button)
3. **Repository Settings:**
   - Name: `zerox-esports`
   - Description: "Official Zerox eSports Website"
   - Visibility: **Public** (required for free GitHub Pages)
   - ✅ Initialize with README
   - Click "Create Repository"

### Step 2: Upload Your Files

**Option A: Using GitHub Web Interface** (Easiest for beginners)

1. Click "uploading an existing file"
2. **Drag and drop** or select ALL files from `f:\Zerox eSports` folder:
   ```
   index.html
   assets/
   ├── css/
   │   ├── main.css
   │   ├── components.css
   │   └── forms.css
   ├── js/
   │   ├── main.js
   │   └── forms.js
   └── images/
       └── logos/
   ```
3. Commit message: "Initial website upload"
4. Click "Commit changes"

**Option B: Using Git CLI** (For advanced users)

```bash
cd "f:\Zerox eSports"
git init
git add .
git commit -m "Initial commit: Zerox eSports website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/zerox-esports.git
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to repository **Settings** tab
2. Scroll to **Pages** section (left sidebar)
3. **Source:** Deploy from a branch
4. **Branch:** Select `main` → folder `/root`
5. Click **Save**
6. Wait 2-5 minutes ⏰

### Step 4: Your Website is Live! 🎉

Your website will be available at:
```
https://YOUR_USERNAME.github.io/zerox-esports/
```

---

## 📧 Setting Up Form Submissions (Required!)

Your forms currently use Formspree. Follow these steps:

### Step 1: Create Formspree Account

1. Go to **[formspree.io](https://formspree.io)**
2. Sign up (FREE tier allows 50 submissions/month)
3. Click "New Project"
4. Create 3 forms:
   - `selection-round`
   - `spectator-pass`
   - `vip-pass`

### Step 2: Get Form IDs

For each form created, Formspree will give you an endpoint like:
```
https://formspree.io/f/YOUR_FORM_ID
```

### Step 3: Update forms.js

Edit `assets/js/forms.js` and replace `YOUR_FORM_ID` with actual IDs:

**Line ~51:** Selection Form
```javascript
const response = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
```
Change `YOUR_FORM_ID` to your **selection-round** form ID

**Line ~72:** Spectator Form  
Replace with **spectator-pass** form ID

**Line ~93:** VIP Form  
Replace with **vip-pass** form ID

### Step 4: Test Forms

1. Open your live website
2. Click "Register Now - ₹299"
3. Fill out the form
4. Submit → Check your Formspree dashboard or email for submissions!

---

## 🔧 Custom Domain (Optional)

Instead of `username.github.io`, use `www.zeroxesports.com`:

1. Buy domain from Namecheap/GoDaddy/etc
2. In domain DNS settings, add:
   - **A Record:** `185.199.108.153`
   - **A Record:** `185.199.109.153`  
   - **A Record:** `185.199.110.153`
   - **A Record:** `185.199.111.153`
   - **CNAME Record:** `www` → `YOUR_USERNAME.github.io`
3. In GitHub repo Settings → Pages:
   - **Custom domain:** `www.zeroxesports.com`
   - ✅ Enforce HTTPS
4. Wait 24-48 hours for DNS propagation

---

## 📊 Form Submission Alternatives

If you need more than Formspree's free tier (50 submissions/month):

### Option 1: EmailJS (Free)
- 200 emails/month free
- Setup: [emailjs.com/docs](https://www.emailjs.com/docs)

### Option 2: Google Forms
- Unlimited submissions  
- Embed iframe in modal instead of custom form

### Option 3: Backend Server
- Deploy Node.js/Python backend on Vercel/Railway (free tier)
- Use Nodemailer or SendGrid API

---

## 🎨 Adding Team Images (When Available)

When you get real player photos:

1. Save images to `assets/images/team/` folder:
   ```
   assets/images/team/
   ├── bgmi-alpha.jpg
   ├── bgmi-viper.jpg
   ├── bgmi-shadow.jpg
   ├── bgmi-blaze.jpg
   ├── ff-inferno.jpg
   ├── ff-blitz.jpg
   ├── ff-nova.jpg
   └── ff-venom.jpg
   ```

2. Update `index.html` player cards (Search for `player-image`):
   ```html
   <!-- Change from: -->
   <div class="player-image">
       <i data-lucide="user-circle" class="player-placeholder"></i>
   </div>

   <!-- To: -->
   <div class="player-image">
       <img src="./assets/images/team/bgmi-alpha.jpg" alt="ZEROX_Alpha">
   </div>
   ```

3. Commit and push changes to GitHub

---

## 🔍 SEO Optimization

To improve Google ranking:

1. **Update** `index.html` meta tags (already done ✅)
2. **Submit** to Google Search Console:
   - Go to [search.google.com/search-console](https://search.google.com/search-console)
   - Add property: `https://YOUR_USERNAME.github.io/zerox-esports/`
   - Submit sitemap (create `sitemap.xml`)
3. **Social Media:**
   - Update real social links in footer & header
   - Share website URL on Instagram, Twitter, Discord

---

## 📱 Testing Checklist

Before going live, test:

- ✅ All 3 registration forms work
- ✅ Mobile responsive (resize browser)
- ✅ Team tabs switch (BGMI ↔ Free Fire MAX)
- ✅ Social media links point to real profiles
- ✅ Images load correctly
- ✅ Smooth scrolling navigation works
- ✅ All buttons/CTAs functional

---

## 🆘 Troubleshooting

**Forms not working?**
- Check you replaced `YOUR_FORM_ID` in `forms.js`
- Check browser console for errors (F12)
- Verify Formspree account is active

**GitHub Pages not loading?**
- Wait 5-10 minutes after deployment
- Check Settings → Pages shows green checkmark
- Clear browser cache (Ctrl+F5)

**Images not showing?**
- Verify file paths are relative: `./assets/images/...`
- Check file names match exactly (case-sensitive on Linux servers)

**Mobile menu not working?**
- Check `main.js` is loaded
- Open browser console (F12) for JavaScript errors

---

## 📞 Support

Need help? Open an issue or contact:
- **Email:** support@zeroxesports.com (update with your email)
- **Discord:** Add your Discord server link
- **Instagram:** @zeroxesports

---

## 🎯 Next Steps After Deployment

1. ✅ Test all forms thoroughly
2. ✅ Add real player photos
3. ✅ Update social media links
4. ✅ Share website on all platforms
5. ✅ Set up Google Analytics (optional)
6. ✅ Monitor form submissions via Formspree dashboard
7. ✅ Collect registrations and send payment details via email

**Dominate. Compete. Conquer.** 🎮⚡
