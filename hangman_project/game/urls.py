"""URL configuration for the game app."""
from django.urls import path
from . import views

urlpatterns = [
    # HTML serving URLs
    path('', views.index_view, name='index'),
    path('login/', views.login_page_view, name='login_page'),
    path('signup/', views.signup_page_view, name='signup_page'),
    path('game/', views.game_page_view, name='game_page'),

    # API URLs
    path('api/signup/', views.signup_api, name='signup_api'),
    path('api/login/', views.login_api, name='login_api'),
    path('api/logout/', views.logout_api, name='logout_api'),
    path('api/get_word/', views.get_word_api, name='get_word_api'),
    path('api/save_progress/', views.save_progress_api, name='save_progress_api'),
    path('api/check_auth/', views.check_auth_status_api, name='check_auth_api'),
    path('api/get_user_profile/', views.get_user_profile_api, name='get_user_profile_api'),
    
]
