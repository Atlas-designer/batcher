# Batch Formatter - Cycle to Work File Processor

A web-based tool for formatting Cycle to Work batch files from various benefit providers into a standardized CSV template.

## Features

- **Multi-format support**: Upload `.csv`, `.xls`, `.xlsx`, or `.pdf` files
- **Visual mapping editor**: Connect source columns to target fields
- **Auto-detect companies**: Automatically matches files to saved processes
- **Validation**: Flags rows with missing required fields
- **Cloud-synced profiles**: Mapping configurations persist across sessions
- **Password protected**: Simple password gate for security

---

## Quick Start (Local Development)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with your password:
   ```
   VITE_APP_PASSWORD=your_password
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

---

## Deployment Guide

### Step 1: Create a GitHub Account (if you don't have one)

1. Go to https://github.com/
2. Click "Sign up"
3. Follow the registration process

### Step 2: Create a GitHub Repository

1. Log into GitHub
2. Click the "+" icon in the top right → "New repository"
3. Fill in:
   - Repository name: `batch-formatter` (or any name)
   - Description: "Cycle to Work batch file formatter"
   - Visibility: **Private** (recommended for work tools)
4. Click "Create repository"
5. You'll see instructions - keep this page open

### Step 3: Push Your Code to GitHub

Open a terminal/command prompt in this project folder and run:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Batch Formatter"

# Connect to your GitHub repository (replace with YOUR repository URL)
git remote add origin https://github.com/YOUR_USERNAME/batch-formatter.git

# Push to GitHub
git branch -M main
git push -u origin main
```

You may be prompted to log in to GitHub.

### Step 4: Create a Netlify Account

1. Go to https://www.netlify.com/
2. Click "Sign up"
3. **Choose "Sign up with GitHub"** (easiest option)
4. Authorize Netlify to access your GitHub

### Step 5: Deploy to Netlify

1. In Netlify dashboard, click **"Add new site"** → **"Import an existing project"**
2. Click **"Deploy with GitHub"**
3. Select your `batch-formatter` repository
4. Configure build settings (should auto-detect):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **"Deploy"**
6. Wait for the build to complete (1-2 minutes)

### Step 6: Add Environment Variables in Netlify

1. In your Netlify site dashboard, go to **"Site settings"**
2. Click **"Environment variables"** in the left sidebar
3. Click **"Add a variable"** and add:

| Key | Value |
|-----|-------|
| `VITE_APP_PASSWORD` | (your chosen password) |

For Firebase (see below), also add:
| `VITE_FIREBASE_API_KEY` | (from Firebase) |
| `VITE_FIREBASE_AUTH_DOMAIN` | (from Firebase) |
| `VITE_FIREBASE_PROJECT_ID` | (from Firebase) |
| `VITE_FIREBASE_STORAGE_BUCKET` | (from Firebase) |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | (from Firebase) |
| `VITE_FIREBASE_APP_ID` | (from Firebase) |

4. Go to **"Deploys"** → Click **"Trigger deploy"** → **"Deploy site"**

### Step 7: Access Your Site

Your site will be live at a URL like: `https://your-site-name.netlify.app`

You can customize this URL in **Site settings** → **Domain management**.

---

## Firebase Setup (for Cloud Storage)

Without Firebase, the app stores mapping profiles in your browser's localStorage (only works on that specific browser/computer).

With Firebase, profiles sync across any device.

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Sign in with your Google account
3. Click **"Create a project"**
4. Enter project name: `batch-formatter`
5. Disable Google Analytics (not needed) → Click **"Create Project"**
6. Wait for creation → Click **"Continue"**

### Step 2: Create Firestore Database

1. In the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in production mode"** → Click **"Next"**
4. Choose location: `europe-west2` (London) → Click **"Enable"**

### Step 3: Set Security Rules

1. In Firestore, click the **"Rules"** tab
2. Replace the rules with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /processes/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click **"Publish"**

### Step 4: Get Your API Keys

1. Click the ⚙️ gear icon → **"Project settings"**
2. Scroll down to **"Your apps"**
3. Click the web icon **`</>`**
4. Enter nickname: `batch-formatter-web`
5. Don't check "Firebase Hosting" → Click **"Register app"**
6. Copy the config values shown

### Step 5: Add to Netlify

Add the Firebase config values to Netlify environment variables (Step 6 above).

---

## Output Format

The tool outputs CSV files with these columns:

| Column | Required | Default |
|--------|----------|---------|
| Firstname | Yes | - |
| Surname | Yes | - |
| Street1 | No | - |
| Street2 | No | - |
| City | No | - |
| County | No | - |
| Postcode | No | - |
| Country | No | UK |
| LOC Amount | Yes | - |
| Email | Yes | - |
| Pay Frequency | No | Monthly |
| Additional Details | No | (configurable) |
| Date of Approval | No | (blank) |

Output filename format: `{CompanyName}_{YYYY-MM-DD}.csv`

---

## Usage

1. **Login** with your password
2. **Upload** a batch file (drag & drop or click)
3. **Map fields** if it's a new company (visual editor)
4. **Review** the output preview and validation warnings
5. **Download** the formatted CSV

The app remembers mappings for each company, so subsequent files from the same company are processed automatically.

---

## Security Notes

- Password is stored in Netlify environment variables (not in code)
- No employee data is stored - only mapping configurations
- All file processing happens in your browser
- Firebase stores only column mappings, not actual data

---

## Troubleshooting

**"App not configured" error on login**
- Make sure you've added `VITE_APP_PASSWORD` in Netlify environment variables
- Trigger a new deploy after adding variables

**Firebase not connecting**
- Check all 6 Firebase environment variables are set in Netlify
- Make sure Firestore database is created and rules are published
- Check browser console for error messages

**File not parsing correctly**
- PDF support is basic - works best with structured table PDFs
- Try saving the PDF as Excel or CSV first if it's not working

---

## Making Updates

After making changes to the code:

```bash
git add .
git commit -m "Description of changes"
git push
```

Netlify will automatically rebuild and deploy.
