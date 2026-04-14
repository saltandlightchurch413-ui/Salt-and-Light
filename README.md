# Church Digital Songbook — Salt & Light Church

A premium, modern worship songbook web application supporting Telugu and English songs.

## 🚀 Tech Stack

- **Backend**: Python Flask + SQLAlchemy ORM
- **Database**: PostgreSQL
- **Migrations**: Flask-Migrate
- **Frontend**: HTML/CSS/JS (SPA-like, no framework)
- **Images**: Cloudinary
- **Auth**: Session-based login
- **Deployment**: Render

## 📋 Setup

### Prerequisites
- Python 3.10+
- PostgreSQL database

### Installation

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env file and configure
copy .env.example .env
# Edit .env with your DATABASE_URL, SECRET_KEY, Cloudinary credentials

# Initialize database
flask db init
flask db migrate -m "initial"
flask db upgrade

# Run the server
python app.py
```

Visit `http://localhost:5000`

### Admin Login
- Email: `saltandlightchurch413@gmail.com`
- Password: `Salt&LightChurch413`

## 🌐 Deploy to Render

1. Push code to a GitHub repository
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New → Blueprint** and select your repo
4. Render will use `render.yaml` to create the web service + database
5. Add Cloudinary environment variables manually in the Render dashboard

## 📂 Project Structure

```
├── app.py              # Flask app factory
├── config.py           # Configuration
├── models.py           # Database models
├── routes/
│   ├── api.py          # Public API routes
│   ├── admin.py        # Admin CRUD routes
│   ├── auth.py         # Login/logout
│   └── main.py         # SPA shell serving
├── utils/
│   ├── search.py       # Telugu/English search engine
│   ├── cloudinary_helper.py
│   └── seed.py         # Initial data seeding
├── static/
│   ├── css/style.css   # Design system
│   └── js/             # SPA modules
├── templates/
│   └── base.html       # SPA shell
├── Procfile            # Render process
└── render.yaml         # Render blueprint
```

## ✨ Features

- 🎵 Song management (Telugu & English)
- 🔍 Advanced search with Telugu Unicode normalization
- 🔤 Alphabetical song index (A–Z + Telugu)
- 🖼 Image gallery with Cloudinary
- 🔗 Dynamic social media links
- ⚙️ Full admin dashboard
- 📱 Mobile-responsive design
- ⚡ SPA-like navigation
