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
            migrations = {
                'footer_caption': "ALTER TABLE about_content ADD COLUMN footer_caption VARCHAR(500) DEFAULT 'Worship the Lord with gladness; come before him with joyful songs.';",
                'church_name': "ALTER TABLE about_content ADD COLUMN church_name VARCHAR(200) DEFAULT 'Salt & Light Church';",
                'hero_title': "ALTER TABLE about_content ADD COLUMN hero_title VARCHAR(200) DEFAULT 'Find Songs Instantly';",
                'hero_subtitle': "ALTER TABLE about_content ADD COLUMN hero_subtitle VARCHAR(500) DEFAULT 'Telugu & English worship songs at your fingertips';",
                'meta_description': "ALTER TABLE about_content ADD COLUMN meta_description TEXT DEFAULT 'Salt & Light Church Digital Songbook — Find Telugu & English worship songs instantly. Browse, search, and share hymns and praise songs.';",
            }
            for col_name, sql in migrations.items():
                if col_name not in columns:
                    try:
                        db.session.execute(text(sql))
                        db.session.commit()
                        print(f'[SEED] Added column: {col_name}')
                    except Exception as col_err:
                        db.session.rollback()
                        print(f'[SEED] Column {col_name} migration skipped: {col_err}')
    except Exception as e:
        db.session.rollback()
        print(f'[SEED] Schema migration error: {e}')

    # Seed admin
    try:
        admin = Admin.query.first()
        if not admin:
            admin = Admin(email='saltandlightchurch413@gmail.com')
            admin.set_password('Salt&LightChurch413')
            db.session.add(admin)
            db.session.commit()
            print('[SEED] Admin user created.')
    except Exception as e:
        db.session.rollback()
        print(f'[SEED] Admin seeding error: {e}')

    # Seed about content
    try:
        about = AboutContent.query.first()
        if not about:
            about = AboutContent(
                title='About Salt & Light Church',
                content='Welcome to Salt & Light Church. We are a community of believers dedicated to worship and fellowship. Edit this content from the admin dashboard.',
            )
            db.session.add(about)
            db.session.commit()
            print('[SEED] About content created.')
    except Exception as e:
        db.session.rollback()
        print(f'[SEED] About content seeding error: {e}')

    # Seed default categories
    try:
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
            db.session.commit()
            print('[SEED] Default categories created.')
    except Exception as e:
        db.session.rollback()
        print(f'[SEED] Categories seeding error: {e}')

    print('[SEED] Database seeding complete.')

