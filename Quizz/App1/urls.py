from django.urls import include, path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('test/', views.view, name='view'),
    path('result/', views.result, name='result')
]

