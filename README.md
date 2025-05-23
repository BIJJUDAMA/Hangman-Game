# Hangman Game - Local Setup Guide

Follow these steps to run the project on your local machine:

---

## Step 1: Clone the Repository
```bash
git clone https://github.com/BIJJUDAMA/Hangman-Game
```

---

## Step 2: Navigate to the Project Directory
```bash
cd Hangman-Game
```

---

## Step 3: Enter the Django Project Root
```bash
cd hangman_project
```

---

## Step 4: Create a Virtual Environment
```bash
python -m venv venv
```

---

## Step 5: Activate the Virtual Environment

### On **Windows**:
```bash
venv\Scripts\activate
```

### On **macOS/Linux**:
```bash
source venv/bin/activate
```

---

## Step 6: Install Dependencies
```bash
pip install -r requirements.txt
```

---

## Step 7: Create a MySQL Database

Open MySQL and run:
```sql
CREATE DATABASE hangman_db_local;
```

---

## Step 8: Configure Database Settings

Open the file:
```
Hangman-Game/hangman_project/hangman_project/settings.py
```

Update the `DATABASES` configuration:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'hangman_db_local',
        'USER': 'hangman_user',  # Replace with your MySQL username
        'PASSWORD': 'your_secure_password',  # Replace with your MySQL password
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}
```

---

## 🛠️ Step 9: Apply Migrations and Run the Server
```bash
python manage.py migrate
python manage.py runserver
```

---

You’re now ready to play the Hangman Game in your browser at:  
http://127.0.0.1:8000/
