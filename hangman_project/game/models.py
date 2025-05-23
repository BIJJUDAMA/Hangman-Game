"""Models for the game application."""
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    """Stores user-specific game data, linked to the default User model."""
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    coins = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)
    xp_to_next_level = models.IntegerField(default=100)


    def __str__(self):
        """Return the username of the associated user."""
        return self.user.username 

@receiver(post_save, sender=User)
def ensure_user_profile_exists(sender, instance, created, **kwargs):
    """Ensure a UserProfile exists for every User, creating one if necessary."""
    if created:
        UserProfile.objects.create(user=instance)
    else:

        UserProfile.objects.get_or_create(user=instance)

class Word(models.Model):
    """Represents a word to be guessed in the game."""
    DIFFICULTY_CHOICES = [('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')]
    text = models.CharField(max_length=50, unique=True)
    category = models.CharField(max_length=50)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)


    def __str__(self):
        """Return the word text along with its category and difficulty."""
        return f"{self.text} ({self.category} - {self.difficulty})"
