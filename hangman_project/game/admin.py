"""Admin configuration for the game app."""
from django.contrib import admin
from .models import UserProfile, Word

admin.site.register(UserProfile)
admin.site.register(Word)
