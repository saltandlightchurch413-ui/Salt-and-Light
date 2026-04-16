from models import db, Admin, AboutContent, Category
from sqlalchemy import inspect, text


def seed_database():
    """Seed the database with initial data if empty."""
    # Ensure all tables are created first
    db.create_all()

    # Automatic specific column migrations for deployed environments
    try:
        inspector = inspect(db.engine)
        if 'about_content' in inspector.get_table_names():
            columns = [col['name'] for col in inspector.get_columns('about_content')]
            if 'footer_caption' not in columns:
                db.session.execute(text("ALTER TABLE about_content ADD COLUMN footer_caption VARCHAR(500) DEFAULT 'Worship the Lord with gladness; come before him with joyful songs.';"))
                db.session.commit()
                print('[SEED] Automatically migrated about_content to add footer_caption column.')
    except Exception as e:
        print(f'[SEED] Schema migration error: {e}')

    # Seed admin
    admin = Admin.query.first()
    if not admin:
        admin = Admin(email='saltandlightchurch413@gmail.com')
        admin.set_password('Salt&LightChurch413')
        db.session.add(admin)
        print('[SEED] Admin user created.')

    # Seed about content
    about = AboutContent.query.first()
    if not about:
        about = AboutContent(
            title='About Salt & Light Church',
            content='Welcome to Salt & Light Church. We are a community of believers dedicated to worship and fellowship. Edit this content from the admin dashboard.',
        )
        db.session.add(about)
        print('[SEED] About content created.')

    # Seed default categories
    if Category.query.count() == 0:
        default_categories = [
            ('Praise & Worship', 'స్తుతి & ఆరాధన'),
            ('Hymns', 'కీర్తనలు'),
            ('Devotional', 'భక్తి గీతాలు'),
            ('Christmas', 'క్రిస్మస్'),
            ('Easter', 'ఈస్టర్'),
            ('Prayer', 'ప్రార్థన'),
            ('Kids', 'పిల్లల పాటలు'),
        ]
        for name, name_te in default_categories:
            cat = Category(name=name, name_te=name_te)
            db.session.add(cat)
        print('[SEED] Default categories created.')

    db.session.commit()
    print('[SEED] Database seeding complete.')
