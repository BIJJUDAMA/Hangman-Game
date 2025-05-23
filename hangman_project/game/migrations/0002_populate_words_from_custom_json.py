import os
import json
from django.db import migrations
from django.conf import settings


JSON_DATA_FILENAME = 'word_data.json' 
APP_NAME = 'game' 

def populate_words(apps, schema_editor):
    Word = apps.get_model(APP_NAME, 'Word')
    json_file_path = os.path.join(settings.BASE_DIR, JSON_DATA_FILENAME)
    if not os.path.exists(json_file_path):
        print(f"\nData file {json_file_path} not found. Skipping word population.")
        return
    with open(json_file_path, 'r', encoding='utf-8') as f:
        words_data = json.load(f)
    words_to_create = []
    existing_word_texts = set(Word.objects.values_list('text', flat=True))
    for item in words_data:
        text = item.get('text')
        category = item.get('category')
        difficulty = item.get('difficulty')
        if not text or not category or not difficulty:
            print(f"Skipping item due to missing data: {item}")
            continue
        text = text.upper()
        if text not in existing_word_texts:
            words_to_create.append(
                Word(text=text, category=category.upper(), difficulty=difficulty.lower())
            )
            existing_word_texts.add(text) 
        else:
            print(f"Word '{text}' already exists in the database. Skipping.")

    if words_to_create:
        Word.objects.bulk_create(words_to_create)
        print(f"\nSuccessfully populated {len(words_to_create)} new words from {JSON_DATA_FILENAME}.")
    else:
        print(f"\nNo new words to populate from {JSON_DATA_FILENAME}.")

def clear_words(apps, schema_editor):
    Word = apps.get_model(APP_NAME, 'Word')
    json_file_path = os.path.join(settings.BASE_DIR, JSON_DATA_FILENAME)

    if not os.path.exists(json_file_path):
        print(f"\nData file {json_file_path} not found. Cannot determine which words to clear.")
        return

    with open(json_file_path, 'r', encoding='utf-8') as f:
        words_data = json.load(f)

    texts_to_delete = [item.get('text').upper() for item in words_data if item.get('text')]
    if texts_to_delete:
        deleted_count, _ = Word.objects.filter(text__in=texts_to_delete).delete()
        print(f"\nCleared {deleted_count} words based on {JSON_DATA_FILENAME}.")
    else:
        print(f"\nNo words to clear based on {JSON_DATA_FILENAME}.")


class Migration(migrations.Migration):
    dependencies = [
        ('game', '0001_initial'), 
    ]
    operations = [
        migrations.RunPython(populate_words, reverse_code=clear_words),
    ]

