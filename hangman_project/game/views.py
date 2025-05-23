"""Views for the game application."""
from django.db import transaction
import json
import random
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Word,UserProfile

def index_view(request):
    """Serves the main index page."""
    return render(request, 'index.html')

def login_page_view(request):
    """Serves the login page."""
    if request.user.is_authenticated:
        return redirect('game_page')
    return render(request, 'login.html')

def signup_page_view(request):
    """Serves the signup page."""
    if request.user.is_authenticated:
        return redirect('game_page')
    return render(request, 'signup.html')

@login_required
def game_page_view(request):
    """Serves the main game page."""
    return render(request, 'game.html')

@csrf_exempt
def signup_api(request):
    """Handles user signup API requests."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            email = data.get('email')
            password = data.get('password')

            if not all([username, email, password]):
                return JsonResponse({'error': 'Missing fields'}, status=400)

            if User.objects.filter(username=username).exists():
                return JsonResponse({'error': 'Username already exists'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'error': 'Email already exists'}, status=400)

            user = User.objects.create_user(username=username, email=email, password=password)

            return JsonResponse({'message': 'Signup successful', 'username': user.username})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

@csrf_exempt
def login_api(request):
    """Handles user login API requests."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email_or_username = data.get('email_or_username') 
            password = data.get('password')
            if not all([email_or_username, password]):
                return JsonResponse({'error': 'Missing fields'}, status=400)

            user = authenticate(request, username=email_or_username, password=password)
            if user is None:
                try:
                    user_obj = User.objects.get(email=email_or_username)
                    user = authenticate(request, username=user_obj.username, password=password)
                except User.DoesNotExist:
                    pass

            if user is not None:
                auth_login(request, user)
                return JsonResponse({'message': 'Login successful', 'username': user.username})
            else:
                return JsonResponse({'error': 'Invalid credentials'}, status=401)
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

def logout_api(request):
    """Handles user logout API requests."""
    auth_logout(request)
    return JsonResponse({'message': 'Logout successful'})

@login_required
def get_word_api(request):
    """Provides a random word based on the user's level."""
    try:
        user_profile = request.user.userprofile
        level = user_profile.level

        difficulty = 'easy'
        if 1 <= level <= 7:
            difficulty = 'easy'
        elif 8 <= level <= 14:
            difficulty = 'medium'
        else:
            difficulty = 'hard'

        words_for_difficulty = list(Word.objects.filter(difficulty=difficulty))

        if not words_for_difficulty:
            all_words = list(Word.objects.all())
            if not all_words:
                return JsonResponse({'error': 'No words available in the database at all.'}, status=404)
            selected_word_obj = random.choice(all_words)
        else:
            selected_word_obj = random.choice(words_for_difficulty)

        return JsonResponse({
            'word': selected_word_obj.text,
            'category': selected_word_obj.category
        })

    except AttributeError:
        return JsonResponse({'error': 'UserProfile not found for the current user.'}, status=500)
    except Exception as e:
        return JsonResponse({'error': 'An unexpected error occurred while fetching a word.'}, status=500)
@login_required
@csrf_exempt
@transaction.atomic
def save_progress_api(request):
    """Saves the user's game progress."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_profile = request.user.userprofile

            user_profile.coins = data.get('coins', user_profile.coins)
            user_profile.streak = data.get('streak', user_profile.streak)
            user_profile.level = data.get('level', user_profile.level)
            user_profile.xp = data.get('xp', user_profile.xp)
            user_profile.xp_to_next_level = data.get('xp_to_next_level', user_profile.xp_to_next_level)
            user_profile.save()
            return JsonResponse({'message': 'Progress saved successfully'})
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        except Exception as e:
            return JsonResponse({'error': f'Error saving progress: {str(e)}'}, status=500)
    return JsonResponse({'error': 'Only POST requests are allowed'}, status=405)

@login_required
def check_auth_status_api(request):
    """
    Confirms if the current user is authenticated and returns their username.
    The @login_required decorator handles the actual authentication check.
    """
    return JsonResponse({
        'isAuthenticated': True,
        'username': request.user.username
    })

@login_required
def get_user_profile_api(request):
    """
    Provides the authenticated user's profile details (coins, streak, level, xp).
    Assumes the user is authenticated due to @login_required.
    """
    if request.method == 'GET':
        try:
            user_profile = UserProfile.objects.get(user=request.user)
            response_data = {
                'username': request.user.username,
                'coins': user_profile.coins,
                'streak': user_profile.streak,
                'level': user_profile.level,
                'xp': user_profile.xp
            }
            return JsonResponse(response_data)
        except UserProfile.DoesNotExist:
            return JsonResponse({
                'username': request.user.username,
                'error': 'UserProfile not found for this user. Returning defaults.',
                'coins': 0, 'streak': 0, 'level': 1, 'xp': 0
            }, status=200)
    else:
        return JsonResponse({'error': 'Only GET requests are allowed for this endpoint.'}, status=405)
